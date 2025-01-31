// yarn test:hardhat test/hardhat/viem/univ3-AutomanV3-transaction.test.ts
import { FeeAmount, nearestUsableTick } from '@aperture_finance/uniswap-v3-sdk';
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
  parseAbiParameters,
  walletActions,
} from 'viem';
import { mainnet } from 'viem/chains';

import {
  ActionTypeEnum,
  ConditionTypeEnum,
  ConsoleLogger,
  ICommonNonfungiblePositionManager__factory,
  IOCKEY_LOGGER,
  UniV3AutomanV3,
  UniV3AutomanV3__factory,
  UniV3OptimalSwapRouter__factory,
  getAMMInfo,
  ioc,
} from '../../../src';
import {
  E_Solver,
  PositionDetails,
  generateAutoCompoundRequestPayload,
  getBasicPositionInfo,
  getERC20Overrides,
  getIncreaseLiquidityOptimalSwapInfoV3,
  getIncreaseLiquidityOptimalV3Tx,
  getMintOptimalSwapInfoV3,
  getMintOptimalV3Tx,
  getMintedPositionIdFromTxReceipt,
  getPool,
  getRebalanceSwapInfoV3,
  getRebalanceV3Tx,
  getReinvestV3Tx,
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

// Tests for UniV3AutomanV3 transactions on a forked Ethereum mainnet.
describe('Viem - UniV3AutomanV3 transaction tests', function () {
  const positionId = 4n;
  const blockNumber = 17188000n;
  let automanV3Contract: UniV3AutomanV3;
  const automanV3Address = getAMMInfo(chainId, amm)!.apertureAutomanV3;
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

    // Deploy Automan.
    automanV3Contract = await new UniV3AutomanV3__factory(
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      /*owner=*/ WHALE_ADDRESS,
    );
    await automanV3Contract.deployed();
    await automanV3Contract.setFeeConfig({
      feeCollector: WHALE_ADDRESS,
      // Set the max fee deduction to 50%.
      feeLimitPips: BigInt('500000000000000000'),
    });
    await automanV3Contract.setControllers([WHALE_ADDRESS], [true]);
    const router = await new UniV3OptimalSwapRouter__factory(
      // TODO: migrate ethers
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(getAMMInfo(chainId, amm)!.nonfungiblePositionManager);
    await router.deployed();
    await automanV3Contract.setSwapRouters([router.address], [true]);

    // Set Automan address in CHAIN_ID_TO_INFO.
    getAMMInfo(chainId, amm)!.apertureAutomanV3 =
      automanV3Contract.address as `0x${string}`;
    getAMMInfo(chainId, amm)!.optimalSwapRouter =
      router.address as `0x${string}`;

    // Owner of position id 4 sets AutomanV3 as operator.
    const { request } = await publicClient.simulateContract({
      abi: ICommonNonfungiblePositionManager__factory.abi,
      address: getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      functionName: 'setApprovalForAll',
      args: [automanV3Contract.address as Address, true] as const,
      account: eoa,
    });

    await impersonatedOwnerClient.writeContract(request);
  });

  after(() => {
    // Reset AutomanV3 address in CHAIN_ID_TO_INFO.
    getAMMInfo(chainId, amm)!.apertureAutomanV3 = automanV3Address;
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
    const txRequest = await getReinvestV3Tx(
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
        /* slippage =*/ 0.05,
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
      await getRebalanceSwapInfoV3(
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
    const { tx: txRequest } = await getRebalanceV3Tx(
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
      await getRebalanceSwapInfoV3(
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
    const { tx: txRequest } = await getRebalanceV3Tx(
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
      getAMMInfo(chainId, amm)!.apertureAutomanV3,
    );
    const { swapData, liquidity } = (
      await getMintOptimalSwapInfoV3(
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
    const { tx: txRequest } = await getMintOptimalV3Tx(
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
    // Owner of position id 4 sets Automan as operator.
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

  it('Optimal mint without 1inch', async function () {
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
      getAMMInfo(chainId, amm)!.apertureAutomanV3,
    );
    const { swapData, liquidity } = (
      await getMintOptimalSwapInfoV3(
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
    const { tx: txRequest } = await getMintOptimalV3Tx(
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
      getAMMInfo(chainId, amm)!.apertureAutomanV3,
    );
    const { swapData, liquidity } = (
      await getIncreaseLiquidityOptimalSwapInfoV3(
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
    const { tx: txRequest } = await getIncreaseLiquidityOptimalV3Tx(
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
      getAMMInfo(chainId, amm)!.apertureAutomanV3,
    );
    const { swapData, liquidity } = (
      await getIncreaseLiquidityOptimalSwapInfoV3(
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
    const { tx: txRequest } = await getIncreaseLiquidityOptimalV3Tx(
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
});
