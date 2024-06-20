import { providers } from '@0xsequence/multicall';
import { FeeAmount, nearestUsableTick } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { BigNumber, BigNumberish, Signer } from 'ethers';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import JSBI from 'jsbi';
import { Address } from 'viem';

import {
  ApertureSupportedChainId,
  UniV3Automan,
  UniV3Automan__factory,
  UniV3OptimalSwapRouter__factory,
  getAMMInfo,
} from '../../../src';
import {
  getBasicPositionInfo,
  getERC20Overrides,
  getIncreaseLiquidityOptimalTx,
  getMintedPositionIdFromTxReceipt,
  getNPM,
  getOptimalMintTx,
  getPool,
  getPosition,
  getRebalanceTx,
} from '../../../src/helper';
import {
  WBTC_ADDRESS,
  WETH_ADDRESS,
  WHALE_ADDRESS,
  amm,
  chainId,
  eoa,
  expect,
  hardhatForkProvider,
  resetHardhatNetwork,
} from './common';

// Tests for UniV3Automan transactions on a forked Ethereum mainnet.
describe('Helper - UniV3Automan transaction tests', function () {
  const positionId = 4;
  let automanContract: UniV3Automan;
  let impersonatedOwnerSigner: Signer;
  const automanAddress = getAMMInfo(chainId, amm)!.apertureAutoman;

  beforeEach(async function () {
    await resetHardhatNetwork();

    // Without this, Hardhat throws an InvalidInputError saying that WHALE_ADDRESS is an unknown account.
    // Likely a Hardhat bug.
    await hardhatForkProvider.getBalance(WHALE_ADDRESS);

    // Deploy Automan.
    automanContract = await new UniV3Automan__factory(
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
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
    ).deploy(getAMMInfo(chainId, amm)!.nonfungiblePositionManager);
    await router.deployed();
    await automanContract.setSwapRouters([router.address], [true]);

    // Set Automan address in CHAIN_ID_TO_INFO.
    getAMMInfo(chainId, amm)!.apertureAutoman =
      automanContract.address as `0x${string}`;
    getAMMInfo(chainId, amm)!.optimalSwapRouter =
      router.address as `0x${string}`;

    // Owner of position id 4 sets Automan as operator.
    impersonatedOwnerSigner = await ethers.getImpersonatedSigner(eoa);
    await getNPM(chainId, amm, impersonatedOwnerSigner).setApprovalForAll(
      automanContract.address,
      true,
    );
  });

  after(() => {
    // Reset Automan address in CHAIN_ID_TO_INFO.
    getAMMInfo(chainId, amm)!.apertureAutoman = automanAddress;
  });

  it('Rebalance', async function () {
    const existingPosition = await getPosition(
      chainId,
      amm,
      positionId,
      hardhatForkProvider,
    );
    const { tx: txRequest } = await getRebalanceTx(
      chainId,
      amm,
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
      amm,
      txReceipt,
      eoa,
    )!;
    expect(
      await getBasicPositionInfo(
        chainId,
        amm,
        newPositionId,
        hardhatForkProvider,
      ),
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

  // getRebalanceTx is deprecated
  it.skip('Rebalance with 1inch', async function () {
    const existingPosition = await getPosition(
      chainId,
      amm,
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
      getAMMInfo(chainId, amm)!.apertureAutoman,
    );
    const { tx: txRequest } = await getRebalanceTx(
      chainId,
      amm,
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
      amm,
      txReceipt,
      eoa,
    )!;
    expect(
      await getBasicPositionInfo(
        chainId,
        amm,
        newPositionId,
        hardhatForkProvider,
      ),
    ).to.deep.contains({
      token0: existingPosition.pool.token0,
      token1: existingPosition.pool.token1,
      fee: existingPosition.pool.fee,
      tickLower: 240000,
      tickUpper: 300000,
    });
  });

  // This test is known to be flaky, skip it for now
  it.skip('Optimal mint with 1inch', async function () {
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.MEDIUM,
      chainId,
      amm,
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
      getAMMInfo(chainId, amm)!.apertureAutoman,
    );
    const { tx } = await getOptimalMintTx(
      chainId,
      amm,
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
      amm,
      txReceipt,
      eoa,
    )!;
    const newPosition = await getBasicPositionInfo(
      chainId,
      amm,
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

  // getOptimalMintTx is deprecated
  it.skip('Optimal mint without 1inch', async function () {
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.MEDIUM,
      chainId,
      amm,
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
      getAMMInfo(chainId, amm)!.apertureAutoman,
    );
    const { tx } = await getOptimalMintTx(
      chainId,
      amm,
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
      amm,
      txReceipt,
      eoa,
    )!;
    const newPosition = await getBasicPositionInfo(
      chainId,
      amm,
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

  // unit test with 1inch is unstable, skip it for now
  it.skip('Increase liquidity optimal with 1inch', async function () {
    const existingPosition = await getPosition(
      chainId,
      amm,
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
      getAMMInfo(chainId, amm)!.apertureAutoman,
    );

    const { tx } = await getIncreaseLiquidityOptimalTx(
      {
        tokenId: positionId,
        slippageTolerance: new Percent(50, 100),
        deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      },
      chainId,
      amm,
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
      amm,
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

  // getIncreaseLiquidityOptimalTx is deprecated
  it.skip('Increase liquidity optimal without 1inch', async function () {
    this.timeout(60 * 1000); // Increase the timeout to 60 seconds.
    const existingPosition = await getPosition(
      chainId,
      amm,
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
      getAMMInfo(chainId, amm)!.apertureAutoman,
    );
    const { tx } = await getIncreaseLiquidityOptimalTx(
      {
        tokenId: positionId,
        slippageTolerance: new Percent(5, 1000),
        deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      },
      chainId,
      amm,
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
      amm,
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
});
