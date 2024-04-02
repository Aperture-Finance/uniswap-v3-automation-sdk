import { providers } from '@0xsequence/multicall';
import { FeeAmount, nearestUsableTick } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BigNumber, BigNumberish, Signer } from 'ethers';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import JSBI from 'jsbi';
import { Address } from 'viem';

import {
  ActionTypeEnum,
  ApertureSupportedChainId,
  ConditionTypeEnum,
  UniV3Automan,
  UniV3Automan__factory,
  UniV3OptimalSwapRouter__factory,
  getAMMInfo,
} from '../../../src';
import {
  generateAutoCompoundRequestPayload,
  getBasicPositionInfo,
  getERC20Overrides,
  getIncreaseLiquidityOptimalTx,
  getMintedPositionIdFromTxReceipt,
  getNPM,
  getOptimalMintTx,
  getPool,
  getPosition,
  getRebalanceTx,
  getReinvestTx,
  getZapOutTx,
} from '../../../src/helper';
import {
  WBTC_ADDRESS,
  WETH_ADDRESS,
  WHALE_ADDRESS,
  chainId,
  eoa,
  expect,
  hardhatForkProvider,
  resetHardhatNetwork,
} from './common';

describe('Helper - Automan transaction tests', function () {
  const positionId = 4;
  let automanContract: UniV3Automan;
  let impersonatedOwnerSigner: Signer;
  const automanAddress = getAMMInfo(
    chainId,
    AutomatedMarketMakerEnum.enum.UNISWAP_V3,
  )!.apertureAutoman;

  beforeEach(async function () {
    await resetHardhatNetwork();

    // Without this, Hardhat throws an InvalidInputError saying that WHALE_ADDRESS is an unknown account.
    // Likely a Hardhat bug.
    await hardhatForkProvider.getBalance(WHALE_ADDRESS);

    // Deploy Automan.
    automanContract = await new UniV3Automan__factory(
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(
      getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.UNISWAP_V3)!
        .nonfungiblePositionManager,
      /*owner=*/ WHALE_ADDRESS,
    );
    await automanContract.deployed();
    await automanContract.setFeeConfig({
      feeCollector: WHALE_ADDRESS,
      // Set the max fee deduction to 50%.
      feeLimitPips: BigNumber.from('500000000000000000'),
    });
    await automanContract.setControllers([WHALE_ADDRESS], [true]);
    const router = await new UniV3OptimalSwapRouter__factory(
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(
      getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.UNISWAP_V3)!
        .nonfungiblePositionManager,
    );
    await router.deployed();
    await automanContract.setSwapRouters([router.address], [true]);

    // Set Automan address in CHAIN_ID_TO_INFO.
    getAMMInfo(
      chainId,
      AutomatedMarketMakerEnum.enum.UNISWAP_V3,
    )!.apertureAutoman = automanContract.address as `0x${string}`;
    getAMMInfo(
      chainId,
      AutomatedMarketMakerEnum.enum.UNISWAP_V3,
    )!.optimalSwapRouter = router.address as `0x${string}`;

    // Owner of position id 4 sets Automan as operator.
    impersonatedOwnerSigner = await ethers.getImpersonatedSigner(eoa);
    await getNPM(chainId, impersonatedOwnerSigner).setApprovalForAll(
      automanContract.address,
      true,
    );
  });

  after(() => {
    // Reset Automan address in CHAIN_ID_TO_INFO.
    getAMMInfo(
      chainId,
      AutomatedMarketMakerEnum.enum.UNISWAP_V3,
    )!.apertureAutoman = automanAddress;
  });

  it('Rebalance', async function () {
    const existingPosition = await getPosition(
      chainId,
      positionId,
      hardhatForkProvider,
    );
    const { tx: txRequest } = await getRebalanceTx(
      chainId,
      eoa,
      positionId,
      240000,
      300000,
      /*slippageTolerance=*/ new Percent(1, 100),
      /*deadlineEpochSeconds=*/ Math.floor(Date.now() / 1000),
      hardhatForkProvider,
      existingPosition,
    );
    const txReceipt = await (
      await impersonatedOwnerSigner.sendTransaction(txRequest)
    ).wait();
    const newPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      txReceipt,
      eoa,
    )!;
    expect(
      await getBasicPositionInfo(chainId, newPositionId, hardhatForkProvider),
    ).to.deep.equal({
      token0: existingPosition.pool.token0,
      token1: existingPosition.pool.token1,
      fee: existingPosition.pool.fee,
      liquidity: '13291498909567',
      tickLower: 240000,
      tickUpper: 300000,
    });
  });

  async function dealERC20(
    chainId: ApertureSupportedChainId,
    token0: string,
    token1: string,
    amount0: BigNumberish,
    amount1: BigNumberish,
    from: string,
    to: string,
  ) {
    const provider = new ethers.providers.InfuraProvider(chainId);
    const [token0Overrides, token1Overrides] = await Promise.all([
      getERC20Overrides(token0, from, to, amount0, provider),
      getERC20Overrides(token1, from, to, amount1, provider),
    ]);
    for (const slot of Object.keys(token0Overrides[token0].stateDiff!)) {
      await hardhatForkProvider.send('hardhat_setStorageAt', [
        token0,
        slot,
        defaultAbiCoder.encode(['uint256'], [amount0]),
      ]);
    }
    for (const slot of Object.keys(token1Overrides[token1].stateDiff!)) {
      await hardhatForkProvider.send('hardhat_setStorageAt', [
        token1,
        slot,
        defaultAbiCoder.encode(['uint256'], [amount1]),
      ]);
    }
  }

  it('Rebalance with 1inch', async function () {
    const existingPosition = await getPosition(
      chainId,
      positionId,
      hardhatForkProvider,
    );
    await dealERC20(
      chainId,
      existingPosition.pool.token0.address,
      existingPosition.pool.token1.address,
      existingPosition.amount0.multiply(2).quotient.toString(),
      existingPosition.amount1.multiply(2).quotient.toString(),
      eoa,
      getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.UNISWAP_V3)!
        .apertureAutoman,
    );
    const { tx: txRequest } = await getRebalanceTx(
      chainId,
      eoa,
      positionId,
      240000,
      300000,
      /*slippageTolerance=*/ new Percent(50, 100),
      /*deadlineEpochSeconds=*/ Math.floor(Date.now() / 1000),
      // Hardhat provider doesn't support 'eth_createAccessList' and state overrides.
      new providers.MulticallProvider(hardhatForkProvider),
      existingPosition,
      undefined,
      true,
    );
    const txReceipt = await (
      await impersonatedOwnerSigner.sendTransaction(txRequest)
    ).wait();
    const newPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      txReceipt,
      eoa,
    )!;
    expect(
      await getBasicPositionInfo(chainId, newPositionId, hardhatForkProvider),
    ).to.deep.contains({
      token0: existingPosition.pool.token0,
      token1: existingPosition.pool.token1,
      fee: existingPosition.pool.fee,
      tickLower: 240000,
      tickUpper: 300000,
    });
  });

  // This test is known to be flaky.
  it('Optimal mint with 1inch', async function () {
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.MEDIUM,
      chainId,
      hardhatForkProvider,
    );
    const amount0 = BigNumber.from(10).pow(pool.token0.decimals);
    const amount1 = BigNumber.from(10).pow(pool.token1.decimals);
    const tickLower = nearestUsableTick(
      pool.tickCurrent - 1000,
      pool.tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      pool.tickCurrent + 1000,
      pool.tickSpacing,
    );
    await dealERC20(
      chainId,
      pool.token0.address,
      pool.token1.address,
      amount0,
      amount1,
      eoa,
      getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.UNISWAP_V3)!
        .apertureAutoman,
    );
    const { tx } = await getOptimalMintTx(
      chainId,
      CurrencyAmount.fromRawAmount(pool.token0, amount0.toString()),
      CurrencyAmount.fromRawAmount(pool.token1, amount1.toString()),
      FeeAmount.MEDIUM,
      tickLower,
      tickUpper,
      eoa,
      Math.floor(Date.now() / 1000) + 60,
      0.5,
      new providers.MulticallProvider(hardhatForkProvider),
      true,
    );

    const txReceipt = await (
      await impersonatedOwnerSigner.sendTransaction(tx)
    ).wait();
    const newPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      txReceipt,
      eoa,
    )!;
    const newPosition = await getBasicPositionInfo(
      chainId,
      newPositionId,
      hardhatForkProvider,
    );
    expect(newPosition).to.deep.contains({
      token0: pool.token0,
      token1: pool.token1,
      fee: pool.fee,
      tickLower,
      tickUpper,
    });
  });

  it('Optimal mint without 1inch', async function () {
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.MEDIUM,
      chainId,
      hardhatForkProvider,
    );
    const amount0 = BigNumber.from(10).pow(pool.token0.decimals);
    const amount1 = BigNumber.from(10).pow(pool.token1.decimals);
    const tickLower = nearestUsableTick(
      pool.tickCurrent - 1000,
      pool.tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      pool.tickCurrent + 1000,
      pool.tickSpacing,
    );
    await dealERC20(
      chainId,
      pool.token0.address,
      pool.token1.address,
      amount0,
      amount1,
      eoa,
      getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.UNISWAP_V3)!
        .apertureAutoman,
    );
    const { tx } = await getOptimalMintTx(
      chainId,
      CurrencyAmount.fromRawAmount(pool.token0, amount0.toString()),
      CurrencyAmount.fromRawAmount(pool.token1, amount1.toString()),
      FeeAmount.MEDIUM,
      tickLower,
      tickUpper,
      eoa,
      Math.floor(Date.now() / 1000) + 60,
      0.5,
      new providers.MulticallProvider(hardhatForkProvider),
      false,
    );

    const txReceipt = await (
      await impersonatedOwnerSigner.sendTransaction(tx)
    ).wait();
    const newPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      txReceipt,
      eoa,
    )!;
    const newPosition = await getBasicPositionInfo(
      chainId,
      newPositionId,
      hardhatForkProvider,
    );

    expect(newPosition).to.deep.contains({
      token0: pool.token0,
      token1: pool.token1,
      fee: pool.fee,
      tickLower,
      tickUpper,
      liquidity: '430845571946454',
    });
  });

  it('Increase liquidity optimal with 1inch', async function () {
    const existingPosition = await getPosition(
      chainId,
      positionId,
      hardhatForkProvider,
    );
    const pool = existingPosition.pool;
    const amount0 = BigNumber.from(10).pow(pool.token0.decimals);
    const amount1 = BigNumber.from(10).pow(pool.token1.decimals);
    await dealERC20(
      chainId,
      pool.token0.address,
      pool.token1.address,
      amount0,
      amount1,
      eoa,
      getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.UNISWAP_V3)!
        .apertureAutoman,
    );

    const { tx } = await getIncreaseLiquidityOptimalTx(
      {
        tokenId: positionId,
        slippageTolerance: new Percent(50, 100),
        deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      },
      chainId,
      CurrencyAmount.fromRawAmount(pool.token0, amount0.toString()),
      CurrencyAmount.fromRawAmount(pool.token1, amount1.toString()),
      eoa as Address,
      new providers.MulticallProvider(hardhatForkProvider),
      existingPosition,
      true,
    );

    await (await impersonatedOwnerSigner.sendTransaction(tx)).wait();
    const newPosition = await getBasicPositionInfo(
      chainId,
      positionId,
      hardhatForkProvider,
    );
    expect(newPosition).to.deep.contains({
      token0: pool.token0,
      token1: pool.token1,
      fee: pool.fee,
      tickLower: existingPosition.tickLower,
      tickUpper: existingPosition.tickUpper,
    });
    expect(
      JSBI.GT(newPosition.liquidity!, existingPosition.liquidity!),
    ).to.equal(true);
  });

  it('Increase liquidity optimal without 1inch', async function () {
    const existingPosition = await getPosition(
      chainId,
      positionId,
      hardhatForkProvider,
    );
    const pool = existingPosition.pool;
    const amount0 = BigNumber.from(10).pow(pool.token0.decimals);
    const amount1 = BigNumber.from(10).pow(pool.token1.decimals);
    await dealERC20(
      chainId,
      pool.token0.address,
      pool.token1.address,
      amount0,
      amount1,
      eoa,
      getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.UNISWAP_V3)!
        .apertureAutoman,
    );
    const { tx } = await getIncreaseLiquidityOptimalTx(
      {
        tokenId: positionId,
        slippageTolerance: new Percent(5, 1000),
        deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      },
      chainId,
      CurrencyAmount.fromRawAmount(pool.token0, amount0.toString()),
      CurrencyAmount.fromRawAmount(pool.token1, amount1.toString()),
      eoa as Address,
      new providers.MulticallProvider(hardhatForkProvider),
      existingPosition,
      false,
    );

    await (await impersonatedOwnerSigner.sendTransaction(tx)).wait();
    const newPosition = await getBasicPositionInfo(
      chainId,
      positionId,
      hardhatForkProvider,
    );

    expect(newPosition).to.deep.contains({
      token0: pool.token0,
      token1: pool.token1,
      fee: pool.fee,
      tickLower: existingPosition.tickLower,
      tickUpper: existingPosition.tickUpper,
      liquidity: '119758517567519',
    });
  });

  it('Test getZapOutTx', async function () {
    const { tx } = await getZapOutTx(
      chainId,
      eoa,
      positionId,
      true,
      /*slippageTolerance=*/ new Percent(1, 100),
      /*deadlineEpochSeconds=*/ Math.floor(Date.now() / 1000),
      hardhatForkProvider,
    );
    const eoaSigner = await ethers.getImpersonatedSigner(eoa);
    await (await eoaSigner.sendTransaction(tx)).wait();
  });

  it('Reinvest', async function () {
    const liquidityBeforeReinvest = (
      await getBasicPositionInfo(chainId, positionId, hardhatForkProvider)
    ).liquidity!;
    const { tx: txRequest } = await getReinvestTx(
      chainId,
      eoa,
      positionId,
      /*slippageTolerance=*/ new Percent(1, 100),
      /*deadlineEpochSeconds=*/ Math.floor(Date.now() / 1000),
      hardhatForkProvider,
    );
    await (await impersonatedOwnerSigner.sendTransaction(txRequest)).wait();
    const liquidityAfterReinvest = (
      await getBasicPositionInfo(chainId, positionId, hardhatForkProvider)
    ).liquidity!;
    expect(liquidityBeforeReinvest.toString()).to.equal('34399999543676');
    expect(liquidityAfterReinvest.toString()).to.equal('39910987438794');
    expect(
      generateAutoCompoundRequestPayload(
        eoa,
        chainId,
        AutomatedMarketMakerEnum.enum.UNISWAP_V3,
        positionId,
        /*feeToPrincipalRatioThreshold=*/ 0.1,
        /*slippage=*/ 0.05,
        /*maxGasProportion=*/ 0.01,
        1627776000,
      ),
    ).to.deep.equal({
      action: {
        maxGasProportion: 0.01,
        slippage: 0.05,
        type: ActionTypeEnum.enum.Reinvest,
      },
      chainId: 1,
      automatedMarketMaker: AutomatedMarketMakerEnum.enum.UNISWAP_V3,
      condition: {
        feeToPrincipalRatioThreshold: 0.1,
        type: ConditionTypeEnum.enum.AccruedFees,
      },
      nftId: positionId.toString(),
      ownerAddr: eoa,
      expiration: 1627776000,
    });
  });
});
