// yarn test:hardhat test/hardhat/viem/univ3-automanV4-transaction.test.ts
import {
  FeeAmount,
  RemoveLiquidityOptions,
  nearestUsableTick,
} from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import hre, { ethers } from 'hardhat';
import JSBI from 'jsbi';
import {
  Address,
  PublicClient,
  TestClient,
  WalletClient,
  encodeAbiParameters,
  getContract,
  parseAbiParameters,
  walletActions,
} from 'viem';
import { mainnet } from 'viem/chains';

import {
  ActionTypeEnum,
  ConditionTypeEnum,
  ConsoleLogger,
  ICommonNonfungiblePositionManager__factory,
  IERC20__factory,
  IOCKEY_LOGGER,
  UniV3AutomanV4,
  UniV3AutomanV4__factory,
  UniV3OptimalSwapRouter__factory,
  ZERO_ADDRESS,
  getAMMInfo,
  ioc,
} from '../../../src';
import {
  E_Solver,
  PositionDetails,
  generateAutoCompoundRequestPayload,
  getBasicPositionInfo,
  getDecreaseLiquidityV4SwapInfo,
  getDecreaseLiquidityV4Tx,
  getERC20Overrides,
  getIncreaseLiquidityOptimalSwapInfoV4,
  getIncreaseLiquidityOptimalV4Tx,
  getMintOptimalSwapInfoV4,
  getMintOptimalV4Tx,
  getMintedPositionIdFromTxReceipt,
  getPool,
  getRebalanceSwapInfoV4,
  getRebalanceV4Tx,
  getReinvestV4Tx,
} from '../../../src/viem';
import {
  WBTC_ADDRESS,
  WETH_ADDRESS,
  WHALE_ADDRESS,
  UNIV3_AMM as amm,
  chainId,
  eoa,
  expect,
  getApiClient,
  hardhatForkProvider,
  resetFork,
} from '../common';

// Tests for UniV3AutomanV4 transactions on a forked Ethereum mainnet.
describe('Viem - UniV3AutomanV4 transaction tests', function () {
  const positionId = 4n;
  const blockNumber = 17188000n;
  let automanV4Contract: UniV3AutomanV4;
  const automanV4Address = getAMMInfo(chainId, amm)!.apertureAutomanV4;
  const feeCollector = WHALE_ADDRESS;
  let testClient: TestClient;
  let publicClient: PublicClient;
  let impersonatedOwnerClient: WalletClient;
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);

  beforeEach(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();

    await resetFork(testClient, blockNumber);
    await testClient.impersonateAccount({
      address: eoa,
    });
    impersonatedOwnerClient = testClient.extend(walletActions);

    // Deploy AutomanV4.
    automanV4Contract = await new UniV3AutomanV4__factory(
      // TODO: migrate ethers
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      /*owner=*/ WHALE_ADDRESS,
    );
    await automanV4Contract.deployed();
    await automanV4Contract.setFeeConfig({
      feeCollector,
      // Set the max fee deduction to 50%.
      feeLimitPips: BigInt('500000000000000000'),
    });
    await automanV4Contract.setControllers([WHALE_ADDRESS], [true]);
    const router = await new UniV3OptimalSwapRouter__factory(
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(getAMMInfo(chainId, amm)!.nonfungiblePositionManager);
    await router.deployed();
    await automanV4Contract.setAllowlistedRouters([router.address], [true]);

    // Set AutomanV4 address in CHAIN_ID_TO_INFO.
    getAMMInfo(chainId, amm)!.apertureAutomanV4 =
      automanV4Contract.address as `0x${string}`;
    getAMMInfo(chainId, amm)!.optimalSwapRouter =
      router.address as `0x${string}`;

    // Owner of position id 4 sets AutomanV4 as operator.
    const { request } = await publicClient.simulateContract({
      abi: ICommonNonfungiblePositionManager__factory.abi,
      address: getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      functionName: 'setApprovalForAll',
      args: [automanV4Contract.address as Address, true] as const,
      account: eoa,
    });

    await impersonatedOwnerClient.writeContract(request);
  });

  after(() => {
    // Reset AutomanV4 address in CHAIN_ID_TO_INFO.
    getAMMInfo(chainId, amm)!.apertureAutomanV4 = automanV4Address;
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
    const publicClient = getApiClient();
    const [token0Overrides, token1Overrides] = await Promise.all([
      getERC20Overrides(token0, from, to, amount0, publicClient),
      getERC20Overrides(token1, from, to, amount1, publicClient),
    ]);
    for (const slot of Object.keys(token0Overrides[token0].stateDiff!)) {
      await hardhatForkProvider.send('hardhat_setStorageAt', [
        token0,
        slot,
        encodeAbiParameters(parseAbiParameters('uint256'), [amount0]),
      ]);
    }
    for (const slot of Object.keys(token1Overrides[token1].stateDiff!)) {
      await hardhatForkProvider.send('hardhat_setStorageAt', [
        token1,
        slot,
        encodeAbiParameters(parseAbiParameters('uint256'), [amount1]),
      ]);
    }
  }

  it('Reinvest', async function () {
    const liquidityBeforeReinvest = (
      await getBasicPositionInfo(chainId, amm, positionId, publicClient)
    ).liquidity!;
    const txRequest = await getReinvestV4Tx(
      chainId,
      amm,
      eoa,
      /* increaseOptions= */ {
        tokenId: positionId.toString(),
        slippageTolerance: new Percent(1, 100),
        deadline: Math.floor(Date.now() / 1000),
      },
      /* token0FeeAmount= */ 0n,
      /* token1FeeAmount= */ 0n,
      /* swapData= */ '0x',
      /* amount0Min= */ 0n,
      /* amount1Min= */ 0n,
    );

    await impersonatedOwnerClient.sendTransaction({
      ...txRequest,
      account: eoa,
      chain: mainnet,
    });
    const liquidityAfterReinvest = (
      await getBasicPositionInfo(chainId, amm, positionId, publicClient)
    ).liquidity!;
    expect(liquidityBeforeReinvest.toString()).to.equal('34399999543676');
    expect(liquidityAfterReinvest.toString()).to.equal('39910987438794');
    expect(
      generateAutoCompoundRequestPayload(
        eoa,
        chainId,
        AutomatedMarketMakerEnum.enum.UNISWAP_V3,
        positionId.toString(),
        /* feeToPrincipalRatioThreshold= */ 0.1,
        /* slippage= */ 0.05,
        /* maxGasProportion= */ 0.01,
        /* expiration= */ 1627776000,
      ),
    ).to.deep.equal({
      action: {
        maxGasProportion: 0.01,
        slippage: 0.05,
        type: ActionTypeEnum.enum.Reinvest,
      },
      chainId: 1,
      amm: AutomatedMarketMakerEnum.enum.UNISWAP_V3,
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
      await getRebalanceSwapInfoV4(
        chainId,
        amm,
        publicClient,
        eoa,
        existingPosition,
        /* newPositionTickLower= */ 240000,
        /* newPositionTickUpper= */ 300000,
        /* slippage= */ 0.01,
        /* tokenPricesUsd= */ ['60000', '3000'],
        [E_Solver.SamePool],
      )
    )[0];
    const { tx: txRequest } = await getRebalanceV4Tx(
      chainId,
      amm,
      eoa,
      positionId,
      /* newPositionTickLower= */ 240000,
      /* newPositionTickUpper= */ 300000,
      /* slippageTolerance= */ new Percent(1, 100),
      /* deadlineEpochSeconds= */ BigInt(Math.floor(Date.now() / 1000)),
      publicClient,
      swapData,
      liquidity,
      /* token0FeeAmount= */ 0n,
      /* token1FeeAmount= */ 0n,
      existingPosition.position,
    );
    // Owner of position id 4 sets AutomanV4 as operator.
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
      tickSpacing: existingPosition.pool.tickSpacing,
      liquidity: '13291498909567',
      tickLower: 240000,
      tickUpper: 300000,
    });
  });

  // This test is failing at head: https://github.com/Aperture-Finance/uniswap-v3-automation-sdk/actions/runs/10949023407/job/30401353793?pr=342
  it.skip('Rebalance with 1inch', async function () {
    const existingPosition = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      publicClient,
    );
    const { swapData, liquidity } = (
      await getRebalanceSwapInfoV4(
        chainId,
        amm,
        publicClient,
        eoa,
        existingPosition,
        /* newPositionTickLower= */ 240000,
        /* newPositionTickUpper= */ 300000,
        /* slippage= */ 0.01,
        /* tokenPricesUsd= */ ['60000', '3000'],
        [E_Solver.OneInch],
      )
    )[0];
    const { tx: txRequest } = await getRebalanceV4Tx(
      chainId,
      amm,
      eoa,
      positionId,
      /* newPositionTickLower= */ 240000,
      /* newPositionTickUpper= */ 300000,
      /* slippageTolerance= */ new Percent(1, 100),
      /* deadlineEpochSeconds= */ BigInt(Math.floor(Date.now() / 1000)),
      publicClient,
      swapData,
      liquidity,
      /* token0FeeAmount= */ 0n,
      /* token1FeeAmount= */ 0n,
      existingPosition.position,
    );
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
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
      tickSpacing: existingPosition.pool.tickSpacing,
      tickLower: 240000,
      tickUpper: 300000,
    });
  });

  // TODO: Make this stable and enable for all AMMs.
  // Unit test with 1inch is known to be unstable, skip it for now.
  it.skip('Optimal mint with 1inch', async function () {
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.MEDIUM,
      chainId,
      amm,
      publicClient,
    );
    const tickLower = nearestUsableTick(
      pool.tickCurrent - 1000,
      pool.tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      pool.tickCurrent + 1000,
      pool.tickSpacing,
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
      getAMMInfo(chainId, amm)!.apertureAutomanV4,
    );
    const { swapData, liquidity } = (
      await getMintOptimalSwapInfoV4(
        chainId,
        amm,
        token0Amount,
        token1Amount,
        pool.fee,
        tickLower,
        tickUpper,
        eoa,
        /* slippage= */ 0.5,
        /* tokenPricesUsd= */ ['60000', '3000'],
        publicClient,
        [E_Solver.OneInch],
      )
    )[0];
    const { tx: txRequest } = await getMintOptimalV4Tx(
      chainId,
      amm,
      token0Amount,
      token1Amount,
      pool.fee,
      tickLower,
      tickUpper,
      eoa,
      /* deadlineEpochSeconds= */ BigInt(Math.floor(Date.now() / 1000)),
      /* slippage= */ 0.5,
      publicClient,
      swapData,
      liquidity,
    );
    // Owner of position id 4 sets AutomanV4 as operator.
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
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

  it.skip('Optimal mint without 1inch', async function () {
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.MEDIUM,
      chainId,
      amm,
      publicClient,
    );
    const tickLower = nearestUsableTick(
      pool.tickCurrent - 1000,
      pool.tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      pool.tickCurrent + 1000,
      pool.tickSpacing,
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
      getAMMInfo(chainId, amm)!.apertureAutomanV4,
    );
    const { swapData, liquidity } = (
      await getMintOptimalSwapInfoV4(
        chainId,
        amm,
        token0Amount,
        token1Amount,
        pool.fee,
        tickLower,
        tickUpper,
        eoa,
        /* slippage= */ 0.5,
        /* tokenPricesUsd= */ ['60000', '3000'],
        publicClient,
        [E_Solver.SamePool],
      )
    )[0];
    const { tx: txRequest } = await getMintOptimalV4Tx(
      chainId,
      amm,
      token0Amount,
      token1Amount,
      pool.fee,
      tickLower,
      tickUpper,
      eoa,
      /* deadlineEpochSeconds= */ BigInt(Math.floor(Date.now() / 1000)),
      /* slippage= */ 0.5,
      publicClient,
      swapData,
      liquidity,
    );
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
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

  // TODO: Make this stable and enable for all AMMs.
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
      getAMMInfo(chainId, amm)!.apertureAutomanV4,
    );
    const { swapData, liquidity } = (
      await getIncreaseLiquidityOptimalSwapInfoV4(
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
        /* tokenPricesUsd= */ ['60000', '3000'],
        publicClient,
        [E_Solver.OneInch],
        existingPosition.position,
      )
    )[0];
    const { tx: txRequest } = await getIncreaseLiquidityOptimalV4Tx(
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

    // Owner of position id 4 sets AutomanV4 as operator.
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
      getAMMInfo(chainId, amm)!.apertureAutomanV4,
    );
    const { swapData, liquidity } = (
      await getIncreaseLiquidityOptimalSwapInfoV4(
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
        /* tokenPricesUsd= */ ['60000', '3000'],
        publicClient,
        [E_Solver.SamePool],
        existingPosition.position,
      )
    )[0];
    const { tx: txRequest } = await getIncreaseLiquidityOptimalV4Tx(
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

    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
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

  it('Decrease Liquidity to same tokens', async function () {
    const tokenOut = ZERO_ADDRESS;
    const isUnwrapNative = true;
    const existingPosition = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      publicClient,
    );
    const [pool, token0Contract, token1Contract] = [
      existingPosition.pool,
      getContract({
        address: existingPosition.token0.address as Address,
        abi: IERC20__factory.abi,
        client: publicClient,
      }),
      getContract({
        address: existingPosition.token1.address as Address,
        abi: IERC20__factory.abi,
        client: publicClient,
      }),
    ];
    const decreaseLiquidityOptions: RemoveLiquidityOptions = {
      tokenId: Number(positionId),
      liquidityPercentage: new Percent(49, 100),
      slippageTolerance: new Percent(5, 1000),
      deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      collectOptions: {
        expectedCurrencyOwed0: existingPosition.tokensOwed0,
        expectedCurrencyOwed1: existingPosition.tokensOwed1,
        recipient: eoa,
      },
    };
    const {
      amount0,
      amount1,
      swapData0,
      swapData1,
      token0FeeAmount,
      token1FeeAmount,
    } = await getDecreaseLiquidityV4SwapInfo(
      amm,
      chainId,
      publicClient,
      /* from= */ eoa,
      /* positionDetails= */ existingPosition,
      decreaseLiquidityOptions,
      tokenOut,
      isUnwrapNative,
      /* tokenPricesUsd= */ ['60000', '3000'],
      /* includeSolvers= */ [E_Solver.SamePool],
    );
    const txRequest = await getDecreaseLiquidityV4Tx(
      amm,
      chainId,
      /* from= */ eoa,
      /* positionDetails= */ existingPosition,
      decreaseLiquidityOptions,
      tokenOut,
      /* tokenOutExpected= */ amount0 + amount1,
      token0FeeAmount,
      token1FeeAmount,
      swapData0,
      swapData1,
      isUnwrapNative,
    );
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);

    // Log states before sending the transaction.
    const [
      eoaNativeBalanceBefore,
      eoaToken0BalanceBefore,
      eoaToken1BalanceBefore,
      feeCollectorNativeBalanceBefore,
      feeCollectorToken0BalanceBefore,
      feeCollectorToken1BalanceBefore,
    ] = await Promise.all([
      publicClient.getBalance({ address: eoa }),
      token0Contract.read.balanceOf([eoa]),
      token1Contract.read.balanceOf([eoa]),
      publicClient.getBalance({ address: feeCollector }),
      token0Contract.read.balanceOf([feeCollector]),
      token1Contract.read.balanceOf([feeCollector]),
    ]);

    // Send the transaction and wait for the receipt.
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      chain: walletClient.chain,
    });
    await publicClient.getTransactionReceipt({
      hash: txHash,
    });

    // Get states after the transaction.
    const [
      eoaNativeBalanceAfter,
      eoaToken0BalanceAfter,
      eoaToken1BalanceAfter,
      feeCollectorNativeBalanceAfter,
      feeCollectorToken0BalanceAfter,
      feeCollectorToken1BalanceAfter,
    ] = await Promise.all([
      publicClient.getBalance({ address: eoa }),
      token0Contract.read.balanceOf([eoa]),
      token1Contract.read.balanceOf([eoa]),
      publicClient.getBalance({ address: feeCollector }),
      token0Contract.read.balanceOf([feeCollector]),
      token1Contract.read.balanceOf([feeCollector]),
    ]);

    // Test balance of EOA.
    // existingPosition.tokensOwed1 + existingPositionAmount1 * decreaseLiquidityOptions.liquidityPercentage - existingPosition.tokensOwed1 * feeReinvestRatio - gasFee
    // = 516299277575296150 + 2563561115310177560 * 0.49 - 516299277575296150 * 0.03 - gasFee =
    // = 1756955245750024270 - gasFee = 1738574539302587534
    expect(eoaNativeBalanceAfter - eoaNativeBalanceBefore).to.equal(
      1738574539302587534n,
    );
    // existingPosition.tokensOwed0 + existingPositionAmount0 * decreaseLiquidityOptions.liquidityPercentage - existingPosition.tokensOwed0 * feeReinvestRatio
    // = 3498422 + 26133937 * 0.49 - 3498422 * 0.03 = 16199098
    expect(eoaToken0BalanceAfter - eoaToken0BalanceBefore).to.equal(16199098n);
    expect(eoaToken1BalanceAfter - eoaToken1BalanceBefore).to.equal(0n);

    // Test fees collected.
    expect(token0FeeAmount).to.equal(104953n);
    expect(token1FeeAmount).to.equal(15488978327258885n);
    expect(
      feeCollectorNativeBalanceAfter - feeCollectorNativeBalanceBefore,
    ).to.equal(15488978327258885n);
    expect(
      feeCollectorToken0BalanceAfter - feeCollectorToken0BalanceBefore,
    ).to.equal(104953n);
    expect(
      feeCollectorToken1BalanceAfter - feeCollectorToken1BalanceBefore,
    ).to.equal(0n);

    // Test new position.
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
      JSBI.LT(newPosition.liquidity!, existingPosition.liquidity!),
    ).to.equal(true);
  });

  it('Decrease Liquidity Single zeroForOne', async function () {
    const zeroForOne = true;
    const isUnwrapNative = true;
    const existingPosition = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      publicClient,
    );
    const [pool, token0Contract, token1Contract] = [
      existingPosition.pool,
      getContract({
        address: existingPosition.token0.address as Address,
        abi: IERC20__factory.abi,
        client: publicClient,
      }),
      getContract({
        address: existingPosition.token1.address as Address,
        abi: IERC20__factory.abi,
        client: publicClient,
      }),
    ];
    const decreaseLiquidityOptions: RemoveLiquidityOptions = {
      tokenId: Number(positionId),
      liquidityPercentage: new Percent(49, 100),
      slippageTolerance: new Percent(1000, 1000), // No slippage check because solver (including SamePool solver) doesn't work for a specific blockNumber
      deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      collectOptions: {
        expectedCurrencyOwed0: existingPosition.tokensOwed0,
        expectedCurrencyOwed1: existingPosition.tokensOwed1,
        recipient: eoa,
      },
    };
    const {
      amount0,
      amount1,
      swapData0,
      swapData1,
      token0FeeAmount,
      token1FeeAmount,
    } = await getDecreaseLiquidityV4SwapInfo(
      amm,
      chainId,
      publicClient,
      /* from= */ eoa,
      /* positionDetails= */ existingPosition,
      decreaseLiquidityOptions,
      /* tokenOut= */ (zeroForOne
        ? pool.token1.address
        : pool.token0.address) as Address,
      isUnwrapNative,
      /* tokenPricesUsd= */ ['60000', '3000'],
      /* includeSolvers= */ [E_Solver.SamePool],
    );
    const txRequest = await getDecreaseLiquidityV4Tx(
      amm,
      chainId,
      /* from= */ eoa,
      /* positionDetails= */ existingPosition,
      decreaseLiquidityOptions,
      /* tokenOut= */ (zeroForOne
        ? pool.token1.address
        : pool.token0.address) as Address,
      /* tokenOutExpected= */ amount0 + amount1,
      token0FeeAmount,
      token1FeeAmount,
      swapData0,
      swapData1,
      isUnwrapNative,
    );
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);

    // Log states before sending the transaction.
    const [
      eoaNativeBalanceBefore,
      eoaToken0BalanceBefore,
      eoaToken1BalanceBefore,
      feeCollectorNativeBalanceBefore,
      feeCollectorToken0BalanceBefore,
      feeCollectorToken1BalanceBefore,
    ] = await Promise.all([
      publicClient.getBalance({ address: eoa }),
      token0Contract.read.balanceOf([eoa]),
      token1Contract.read.balanceOf([eoa]),
      publicClient.getBalance({ address: feeCollector }),
      token0Contract.read.balanceOf([feeCollector]),
      token1Contract.read.balanceOf([feeCollector]),
    ]);

    // Send the transaction and wait for the receipt.
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      chain: walletClient.chain,
    });
    await publicClient.getTransactionReceipt({
      hash: txHash,
    });

    // Get states after the transaction.
    const [
      eoaNativeBalanceAfter,
      eoaToken0BalanceAfter,
      eoaToken1BalanceAfter,
      feeCollectorNativeBalanceAfter,
      feeCollectorToken0BalanceAfter,
      feeCollectorToken1BalanceAfter,
    ] = await Promise.all([
      publicClient.getBalance({ address: eoa }),
      token0Contract.read.balanceOf([eoa]),
      token1Contract.read.balanceOf([eoa]),
      publicClient.getBalance({ address: feeCollector }),
      token0Contract.read.balanceOf([feeCollector]),
      token1Contract.read.balanceOf([feeCollector]),
    ]);

    // Test balance of EOA.
    expect(eoaNativeBalanceAfter - eoaNativeBalanceBefore).to.equal(
      4202491007707327400n,
    );
    expect(eoaToken0BalanceAfter - eoaToken0BalanceBefore).to.equal(0n);
    expect(eoaToken1BalanceAfter - eoaToken1BalanceBefore).to.equal(0n);

    // Test fees collected.
    expect(token0FeeAmount).to.equal(145713n);
    expect(token1FeeAmount).to.equal(15488978327258885n);
    expect(
      feeCollectorNativeBalanceAfter - feeCollectorNativeBalanceBefore,
    ).to.equal(15488978327258885n);
    expect(
      feeCollectorToken0BalanceAfter - feeCollectorToken0BalanceBefore,
    ).to.equal(145713n);
    expect(
      feeCollectorToken1BalanceAfter - feeCollectorToken1BalanceBefore,
    ).to.equal(0n);

    // Test new position.
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
      JSBI.LT(newPosition.liquidity!, existingPosition.liquidity!),
    ).to.equal(true);
  });

  it('Decrease Liquidity Single !zeroForOne', async function () {
    const zeroForOne = false;
    const isUnwrapNative = true;
    const existingPosition = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      publicClient,
    );
    const [pool, token0Contract, token1Contract] = [
      existingPosition.pool,
      getContract({
        address: existingPosition.token0.address as Address,
        abi: IERC20__factory.abi,
        client: publicClient,
      }),
      getContract({
        address: existingPosition.token1.address as Address,
        abi: IERC20__factory.abi,
        client: publicClient,
      }),
    ];
    const decreaseLiquidityOptions: RemoveLiquidityOptions = {
      tokenId: Number(positionId),
      liquidityPercentage: new Percent(49, 100),
      slippageTolerance: new Percent(5, 1000),
      deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      collectOptions: {
        expectedCurrencyOwed0: existingPosition.tokensOwed0,
        expectedCurrencyOwed1: existingPosition.tokensOwed1,
        recipient: eoa,
      },
    };
    const {
      amount0,
      amount1,
      swapData0,
      swapData1,
      token0FeeAmount,
      token1FeeAmount,
    } = await getDecreaseLiquidityV4SwapInfo(
      amm,
      chainId,
      publicClient,
      /* from= */ eoa,
      /* positionDetails= */ existingPosition,
      decreaseLiquidityOptions,
      /* tokenOut= */ (zeroForOne
        ? pool.token1.address
        : pool.token0.address) as Address,
      isUnwrapNative,
      /* tokenPricesUsd= */ ['60000', '3000'],
      /* includeSolvers= */ [E_Solver.SamePool],
    );
    const txRequest = await getDecreaseLiquidityV4Tx(
      amm,
      chainId,
      /* from= */ eoa,
      /* positionDetails= */ existingPosition,
      decreaseLiquidityOptions,
      /* tokenOut= */ (zeroForOne
        ? pool.token1.address
        : pool.token0.address) as Address,
      /* tokenOutExpected= */ amount0 + amount1,
      token0FeeAmount,
      token1FeeAmount,
      swapData0,
      swapData1,
      isUnwrapNative,
    );
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);

    // Log states before sending the transaction.
    const [
      eoaNativeBalanceBefore,
      eoaToken0BalanceBefore,
      eoaToken1BalanceBefore,
      feeCollectorNativeBalanceBefore,
      feeCollectorToken0BalanceBefore,
      feeCollectorToken1BalanceBefore,
    ] = await Promise.all([
      publicClient.getBalance({ address: eoa }),
      token0Contract.read.balanceOf([eoa]),
      token1Contract.read.balanceOf([eoa]),
      publicClient.getBalance({ address: feeCollector }),
      token0Contract.read.balanceOf([feeCollector]),
      token1Contract.read.balanceOf([feeCollector]),
    ]);

    // Send the transaction and wait for the receipt.
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      chain: walletClient.chain,
    });
    await publicClient.getTransactionReceipt({
      hash: txHash,
    });

    // Get states after the transaction.
    const [
      eoaNativeBalanceAfter,
      eoaToken0BalanceAfter,
      eoaToken1BalanceAfter,
      feeCollectorNativeBalanceAfter,
      feeCollectorToken0BalanceAfter,
      feeCollectorToken1BalanceAfter,
    ] = await Promise.all([
      publicClient.getBalance({ address: eoa }),
      token0Contract.read.balanceOf([eoa]),
      token1Contract.read.balanceOf([eoa]),
      publicClient.getBalance({ address: feeCollector }),
      token0Contract.read.balanceOf([feeCollector]),
      token1Contract.read.balanceOf([feeCollector]),
    ]);

    // Test balance of EOA.
    expect(eoaNativeBalanceAfter - eoaNativeBalanceBefore).to.equal(
      -19248356964649790n, // negative because of gasFees
    );
    expect(eoaToken0BalanceAfter - eoaToken0BalanceBefore).to.equal(27621381n);
    expect(eoaToken1BalanceAfter - eoaToken1BalanceBefore).to.equal(0n);

    // Test fees collected.
    expect(token0FeeAmount).to.equal(104953n);
    expect(token1FeeAmount).to.equal(19920088887452048n);
    expect(
      feeCollectorNativeBalanceAfter - feeCollectorNativeBalanceBefore,
    ).to.equal(19920088887452048n);
    expect(
      feeCollectorToken0BalanceAfter - feeCollectorToken0BalanceBefore,
    ).to.equal(104953n);
    expect(
      feeCollectorToken1BalanceAfter - feeCollectorToken1BalanceBefore,
    ).to.equal(0n);

    // Test new position.
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
      JSBI.LT(newPosition.liquidity!, existingPosition.liquidity!),
    ).to.equal(true);
  });
});
