import { FeeAmount, nearestUsableTick } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BigNumber } from 'ethers';
import { defaultAbiCoder } from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';
import JSBI from 'jsbi';
import {
  Address,
  PublicClient,
  TestClient,
  WalletClient,
  createPublicClient,
  http,
  parseEther,
  walletActions,
} from 'viem';
import { bsc, mainnet } from 'viem/chains';

import {
  ActionTypeEnum,
  ApertureSupportedChainId,
  ConditionTypeEnum,
  ICommonNonfungiblePositionManager__factory,
  PCSV3Automan,
  PCSV3Automan__factory,
  UniV3OptimalSwapRouter__factory,
  getAMMInfo,
} from '../../../src';
import {
  E_Solver,
  PositionDetails,
  generateAutoCompoundRequestPayload,
  getBasicPositionInfo,
  getERC20Overrides,
  getIncreaseLiquidityOptimalSwapInfo,
  getIncreaseLiquidityOptimalTx,
  getMintedPositionIdFromTxReceipt,
  getOptimalMintSwapInfo,
  getOptimalMintTx,
  getPool,
  getRebalanceSwapInfo,
  getRebalanceTx,
  getReinvestTx,
} from '../../../src/viem';
import { expect, hardhatForkProvider, resetFork } from '../common';

// Tests for PCSV3Automan transactions on a forked BNB mainnet.
describe('Viem - PCSV3Automan transaction tests', function () {
  const amm = AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3;
  const WHALE_ADDRESS = '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3';
  const positionId = 528336n;
  const blockNumber = 37287100n;
  const eoa = '0x4B104b883104d17E618d84f766d0be06F6F6f486';

  const WETH_ADDRESS = '0x2170Ed0880ac9A755fd29B2688956BD959F933F8';
  const WBTC_ADDRESS = '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c';
  const chainId = ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID;

  let automanContract: PCSV3Automan;
  const automanAddress = getAMMInfo(chainId, amm)!.apertureAutoman;
  let testClient: TestClient;
  let publicClient: PublicClient;
  let impersonatedOwnerClient: WalletClient;
  const nonForkClient = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-rpc.publicnode.com'),
  });

  beforeEach(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();

    await resetFork(testClient, blockNumber, process.env.BNB_RPC_URL!);
    await testClient.impersonateAccount({
      address: eoa,
    });
    impersonatedOwnerClient = testClient.extend(walletActions);

    // Deploy Automan.
    automanContract = await new PCSV3Automan__factory(
      // TODO: migrate ethers
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

    // Owner of position id 528336 sets Automan as operator.
    const { request } = await publicClient.simulateContract({
      abi: ICommonNonfungiblePositionManager__factory.abi,
      address: getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      functionName: 'setApprovalForAll',
      args: [automanContract.address as Address, true] as const,
      account: eoa,
    });

    await testClient.setBalance({
      address: eoa,
      value: parseEther('1'),
    });

    await impersonatedOwnerClient.writeContract(request);
  });

  after(() => {
    // Reset Automan address in CHAIN_ID_TO_INFO.
    getAMMInfo(chainId, amm)!.apertureAutoman = automanAddress;
    testClient.stopImpersonatingAccount({
      address: eoa,
    });
  });

  async function dealERC20(
    token0: Address,
    token1: Address,
    amount0: bigint,
    amount1: bigint,
    from: Address,
    to: Address,
  ) {
    const [token0Overrides, token1Overrides] = await Promise.all([
      getERC20Overrides(token0, from, to, amount0, nonForkClient),
      getERC20Overrides(token1, from, to, amount1, nonForkClient),
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

  it('Reinvest', async function () {
    const liquidityBeforeReinvest = (
      await getBasicPositionInfo(chainId, amm, positionId, publicClient)
    ).liquidity!;
    expect(liquidityBeforeReinvest.toString()).to.equal('17360687214921889114');

    const { tx: txRequest } = await getReinvestTx(
      chainId,
      amm,
      eoa,
      positionId,
      /*slippageTolerance=*/ new Percent(1, 100),
      /*deadlineEpochSeconds=*/ BigInt(Math.floor(Date.now() / 1000)),
      publicClient,
    );

    await impersonatedOwnerClient.sendTransaction({
      ...txRequest,
      account: eoa,
      chain: mainnet,
    });

    const liquidityAfterReinvest = (
      await getBasicPositionInfo(chainId, amm, positionId, publicClient)
    ).liquidity!;
    expect(liquidityAfterReinvest.toString()).to.equal('17369508569204326673');

    expect(
      generateAutoCompoundRequestPayload(
        eoa,
        chainId,
        AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3,
        positionId.toString(),
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
      chainId: chainId,
      amm: AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3,
      condition: {
        feeToPrincipalRatioThreshold: 0.1,
        type: ConditionTypeEnum.enum.AccruedFees,
      },
      nftId: positionId.toString(),
      ownerAddr: eoa,
      expiration: 1627776000,
    });
  });

  it('Rebalance', async function () {
    const existingPosition = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      publicClient,
    );
    const { swapData, liquidity } = (
      await getRebalanceSwapInfo(
        chainId,
        amm,
        eoa,
        positionId,
        240000,
        300000,
        0.01 /*slippageTolerance*/,
        ['60000', '3000'],
        publicClient,
        [E_Solver.SamePool],
        existingPosition,
        undefined,
        false,
      )
    )[0];
    const { tx: txRequest } = await getRebalanceTx(
      chainId,
      amm,
      eoa,
      positionId,
      240000,
      300000,
      /*slippageTolerance=*/ new Percent(1, 100),
      /*deadlineEpochSeconds=*/ BigInt(Math.floor(Date.now() / 1000)),
      publicClient,
      swapData,
      liquidity,
      0n /** feeBips */,
      existingPosition.position,
    );
    // Owner of position id 4 sets Automan as operator.
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      // from: txRequest.from,
      chain: walletClient.chain,
    });
    const txReceipt = await publicClient.getTransactionReceipt({
      hash: txHash,
    });
    const newPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      amm,
      txReceipt,
      eoa,
    )!;
    expect(
      await getBasicPositionInfo(chainId, amm, newPositionId, publicClient),
    ).to.deep.equal({
      token0: existingPosition.pool.token0,
      token1: existingPosition.pool.token1,
      fee: existingPosition.pool.fee,
      tickSpacing: 10,
      liquidity: '15250213564999769681912914',
      tickLower: 240000,
      tickUpper: 300000,
    });
  });

  it('Rebalance with 1inch', async function () {
    const existingPosition = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      publicClient,
    );
    const { swapData, liquidity } = (
      await getRebalanceSwapInfo(
        chainId,
        amm,
        eoa,
        positionId,
        240000,
        300000,
        0.01 /*slippageTolerance*/,
        ['60000', '3000'],
        publicClient,
        [E_Solver.OneInch],
        existingPosition,
        undefined,
        false,
      )
    )[0];
    const { tx: txRequest } = await getRebalanceTx(
      chainId,
      amm,
      eoa,
      positionId,
      240000,
      300000,
      /*slippageTolerance=*/ new Percent(1, 100),
      /*deadlineEpochSeconds=*/ BigInt(Math.floor(Date.now() / 1000)),
      publicClient,
      swapData,
      liquidity,
      0n /** feeBips */,
      existingPosition.position,
    );
    // Owner of position id 4 sets Automan as operator.
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      // from: txRequest.from,
      chain: walletClient.chain,
    });
    const txReceipt = await publicClient.getTransactionReceipt({
      hash: txHash,
    });
    const newPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      amm,
      txReceipt,
      eoa,
    )!;
    expect(
      await getBasicPositionInfo(chainId, amm, newPositionId, publicClient),
    ).to.deep.contains({
      token0: existingPosition.pool.token0,
      token1: existingPosition.pool.token1,
      fee: existingPosition.pool.fee,
      tickLower: 240000,
      tickUpper: 300000,
    });
  });

  // Unit test with 1inch is known to be unstable, skip it for now.
  it.skip('Optimal mint with 1inch', async function () {
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.PCS_V3_MEDIUM,
      chainId,
      amm,
      publicClient,
    );
    const token0Amount = CurrencyAmount.fromRawAmount(
      pool.token0,
      '1000000000',
    );
    const token1Amount = CurrencyAmount.fromRawAmount(
      pool.token1,
      '1000000000000000000',
    );
    await dealERC20(
      pool.token0.address as Address,
      pool.token1.address as Address,
      BigInt(token0Amount.quotient.toString()),
      BigInt(token1Amount.quotient.toString()),
      eoa,
      getAMMInfo(chainId, amm)!.apertureAutoman,
    );
    const tickLower = nearestUsableTick(
      pool.tickCurrent - 1000,
      pool.tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      pool.tickCurrent + 1000,
      pool.tickSpacing,
    );
    const { swapData, liquidity } = (
      await getOptimalMintSwapInfo(
        chainId,
        amm,
        token0Amount,
        token1Amount,
        pool.fee,
        tickLower,
        tickUpper,
        eoa,
        0.5,
        publicClient,
        [E_Solver.OneInch],
      )
    )[0];
    const { tx: txRequest } = await getOptimalMintTx(
      chainId,
      amm,
      token0Amount,
      token1Amount,
      pool.fee,
      tickLower,
      tickUpper,
      eoa,
      /*deadlineEpochSeconds=*/ BigInt(Math.floor(Date.now() / 1000)),
      0.5,
      publicClient,
      swapData,
      liquidity,
    );
    // Owner of position id 4 sets Automan as operator.
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      // from: txRequest.from,
      chain: walletClient.chain,
    });
    const txReceipt = await publicClient.getTransactionReceipt({
      hash: txHash,
    });
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
      publicClient,
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
      FeeAmount.PCS_V3_MEDIUM,
      chainId,
      amm,
      publicClient,
    );
    const token0Amount = CurrencyAmount.fromRawAmount(
      pool.token0,
      '1000000000',
    );
    const token1Amount = CurrencyAmount.fromRawAmount(
      pool.token1,
      '1000000000000000000',
    );
    await dealERC20(
      pool.token0.address as Address,
      pool.token1.address as Address,
      BigInt(token0Amount.quotient.toString()),
      BigInt(token1Amount.quotient.toString()),
      eoa,
      getAMMInfo(chainId, amm)!.apertureAutoman,
    );
    const tickLower = nearestUsableTick(
      pool.tickCurrent - 1000,
      pool.tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      pool.tickCurrent + 1000,
      pool.tickSpacing,
    );
    const { swapData, liquidity } = (
      await getOptimalMintSwapInfo(
        chainId,
        amm,
        token0Amount,
        token1Amount,
        pool.fee,
        tickLower,
        tickUpper,
        eoa,
        0.5,
        publicClient,
        [E_Solver.SamePool],
      )
    )[0];
    const { tx: txRequest } = await getOptimalMintTx(
      chainId,
      amm,
      token0Amount,
      token1Amount,
      pool.fee,
      tickLower,
      tickUpper,
      eoa,
      /*deadlineEpochSeconds=*/ BigInt(Math.floor(Date.now() / 1000)),
      0.5,
      publicClient,
      swapData,
      liquidity,
    );
    // Owner of position id 4 sets Automan as operator.
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      // from: txRequest.from,
      chain: walletClient.chain,
    });
    const txReceipt = await publicClient.getTransactionReceipt({
      hash: txHash,
    });
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
      publicClient,
    );
    expect(newPosition).to.deep.contains({
      token0: pool.token0,
      token1: pool.token1,
      fee: pool.fee,
      tickLower,
      tickUpper,
    });
  });

  // Unit test with 1inch is known to be unstable, skip it for now.
  it.skip('Increase liquidity optimal with 1inch', async function () {
    const existingPosition = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      publicClient,
    );
    const pool = existingPosition.pool;
    const token0Amount = CurrencyAmount.fromRawAmount(
      pool.token0,
      '1000000000',
    );
    const token1Amount = CurrencyAmount.fromRawAmount(
      pool.token1,
      '1000000000000000000',
    );
    await dealERC20(
      pool.token0.address as Address,
      pool.token1.address as Address,
      BigInt(token0Amount.quotient.toString()),
      BigInt(token1Amount.quotient.toString()),
      eoa,
      getAMMInfo(chainId, amm)!.apertureAutoman,
    );
    const { swapData, liquidity } = (
      await getIncreaseLiquidityOptimalSwapInfo(
        {
          tokenId: Number(positionId),
          slippageTolerance: new Percent(5, 1000),
          deadline: Math.floor(Date.now() / 1000 + 60 * 30),
        },
        chainId,
        amm,
        token0Amount,
        token1Amount,
        eoa,
        publicClient,
        [E_Solver.OneInch],
        existingPosition.position,
      )
    )[0];
    const { tx: txRequest } = await getIncreaseLiquidityOptimalTx(
      {
        tokenId: Number(positionId),
        slippageTolerance: new Percent(50, 100),
        deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      },
      chainId,
      amm,
      token0Amount,
      token1Amount,
      eoa,
      publicClient,
      swapData,
      liquidity,
      existingPosition.position,
    );

    // Owner of position id 4 sets Automan as operator.
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      // from: txRequest.from,
      chain: walletClient.chain,
    });
    await publicClient.getTransactionReceipt({
      hash: txHash,
    });
    const newPosition = await getBasicPositionInfo(
      chainId,
      amm,
      positionId,
      publicClient,
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
    const existingPosition = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      publicClient,
    );
    const pool = existingPosition.pool;
    const token0Amount = CurrencyAmount.fromRawAmount(
      pool.token0,
      '1000000000',
    );
    const token1Amount = CurrencyAmount.fromRawAmount(
      pool.token1,
      '1000000000000000000',
    );
    await dealERC20(
      pool.token0.address as Address,
      pool.token1.address as Address,
      BigInt(token0Amount.quotient.toString()),
      BigInt(token1Amount.quotient.toString()),
      eoa,
      getAMMInfo(chainId, amm)!.apertureAutoman,
    );
    const { swapData, liquidity } = (
      await getIncreaseLiquidityOptimalSwapInfo(
        {
          tokenId: Number(positionId),
          slippageTolerance: new Percent(5, 1000),
          deadline: Math.floor(Date.now() / 1000 + 60 * 30),
        },
        chainId,
        amm,
        token0Amount,
        token1Amount,
        eoa,
        publicClient,
        [E_Solver.SamePool],
        existingPosition.position,
      )
    )[0];
    const { tx: txRequest } = await getIncreaseLiquidityOptimalTx(
      {
        tokenId: Number(positionId),
        slippageTolerance: new Percent(50, 100),
        deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      },
      chainId,
      amm,
      token0Amount,
      token1Amount,
      eoa,
      publicClient,
      swapData,
      liquidity,
      existingPosition.position,
    );

    // Owner of position id 4 sets Automan as operator.
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      // from: txRequest.from,
      chain: walletClient.chain,
    });
    await publicClient.getTransactionReceipt({
      hash: txHash,
    });
    const newPosition = await getBasicPositionInfo(
      chainId,
      amm,
      positionId,
      publicClient,
    );
    expect(newPosition).to.deep.contains({
      token0: pool.token0,
      token1: pool.token1,
      fee: pool.fee,
      tickLower: existingPosition.tickLower,
      tickUpper: existingPosition.tickUpper,
    });
  });
});
