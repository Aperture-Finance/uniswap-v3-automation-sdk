// yarn test:hardhat test/hardhat/viem/slipstream-automan-transaction.test.ts
import { nearestUsableTick } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BigNumber } from 'ethers';
import { defaultAbiCoder } from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';
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
import { base, mainnet } from 'viem/chains';

import {
  ActionTypeEnum,
  ApertureSupportedChainId,
  ConditionTypeEnum,
  ConsoleLogger,
  ICommonNonfungiblePositionManager__factory,
  IOCKEY_LOGGER,
  SlipStreamAutoman,
  SlipStreamAutoman__factory,
  SlipStreamOptimalSwapRouter__factory,
  getAMMInfo,
  ioc,
} from '../../../src';
import {
  E_Solver,
  PositionDetails,
  generateAutoCompoundRequestPayload,
  getBasicPositionInfo,
  getERC20Overrides,
  getIncreaseLiquidityOptimalSwapInfo,
  getIncreaseLiquidityOptimalTx,
  getMintOptimalSwapInfo,
  getMintOptimalTx,
  getMintedPositionIdFromTxReceipt,
  getPool,
  getRebalanceSwapInfo,
  getRebalanceTx,
  getReinvestTx,
} from '../../../src/viem';
import { expect, hardhatForkProvider, resetFork } from '../common';

// TODO: Unify test cases for all AMMs (UniV3, PCSV3 and SlipStream).

// Tests for SlipStreamAutoman transactions on a forked Base mainnet.
describe('SlipStreamAutoman transaction tests', function () {
  const amm = AutomatedMarketMakerEnum.enum.SLIPSTREAM;
  const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;
  const blockNumber = 17839113n;
  const positionId = 13465n;
  // Owner of position id `positionId` as of `blockNumber`.
  const eoa = '0xeF1Ce5fddd0a1cb903b49608F6e1A37199DCf2a6';
  // A Binance hot wallet address that holds a large amount of ETH and USDC on Base mainnet.
  const WHALE_ADDRESS = '0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A';
  let automanContract: SlipStreamAutoman;
  const automanAddress = getAMMInfo(chainId, amm)!.apertureAutoman;
  let testClient: TestClient;
  let publicClient: PublicClient;
  let impersonatedOwnerClient: WalletClient;
  const nonForkClient = createPublicClient({
    chain: base,
    transport: http('https://base-rpc.publicnode.com'),
  });
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);

  beforeEach(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient, blockNumber, chainId);
    await testClient.impersonateAccount({
      address: eoa,
    });
    impersonatedOwnerClient = testClient.extend(walletActions);

    // Deploy Automan.
    const impersonatedWhaleSigner =
      await ethers.getImpersonatedSigner(WHALE_ADDRESS);
    automanContract = await new SlipStreamAutoman__factory(
      impersonatedWhaleSigner,
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
    const router = await new SlipStreamOptimalSwapRouter__factory(
      // TODO: migrate ethers
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(getAMMInfo(chainId, amm)!.nonfungiblePositionManager);
    await router.deployed();
    await automanContract.setSwapRouters([router.address], [true]);

    // Set Automan address in CHAIN_ID_TO_INFO.
    getAMMInfo(chainId, amm)!.apertureAutoman =
      automanContract.address as `0x${string}`;
    getAMMInfo(chainId, amm)!.optimalSwapRouter =
      router.address as `0x${string}`;

    // `eoa` sets Automan as operator.
    const { request } = await publicClient.simulateContract({
      abi: ICommonNonfungiblePositionManager__factory.abi,
      address: getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      functionName: 'setApprovalForAll',
      args: [automanContract.address as Address, true] as const,
      account: eoa,
    });

    await impersonatedWhaleSigner.sendTransaction({
      to: eoa,
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
    const { tx: txRequest } = await getReinvestTx(
      chainId,
      amm,
      eoa,
      positionId,
      /* slippageTolerance= */ new Percent(1, 100),
      /* deadlineEpochSeconds= */ BigInt(Math.floor(Date.now() / 1000)),
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
    expect(liquidityBeforeReinvest.toString()).to.equal('13589538797482293814');
    expect(liquidityAfterReinvest.toString()).to.equal('14011759555397272426');
    expect(
      generateAutoCompoundRequestPayload(
        eoa,
        chainId,
        AutomatedMarketMakerEnum.enum.SLIPSTREAM,
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
      chainId,
      amm: AutomatedMarketMakerEnum.enum.SLIPSTREAM,
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
        /* newPositionTickLower= */ 78600,
        /* newPositionTickUpper= */ 79400,
        /* slippageTolerance= */ 0.01,
        /* tokenPricesUsd= */ ['60000', '3000'],
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
      /* newPositionTickLower= */ 78600,
      /* newPositionTickUpper= */ 79400,
      /* slippageTolerance= */ new Percent(1, 100),
      /* deadlineEpochSeconds= */ BigInt(Math.floor(Date.now() / 1000)),
      publicClient,
      swapData,
      liquidity,
      /* feeBips= */ 0n,
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
    ).to.deep.equal({
      token0: existingPosition.pool.token0,
      token1: existingPosition.pool.token1,
      fee: existingPosition.pool.fee,
      tickSpacing: existingPosition.pool.tickSpacing,
      liquidity: '7008927949436597297',
      tickLower: 78600,
      tickUpper: 79400,
    });
  });

  // This test is flaky due to mismatch between the forked state and the most recent live network state which 1inch API operates on.
  // TODO: Make this test stable and enable it for all AMMs.
  it.skip('Rebalance with 1inch', async function () {
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
        /* newPositionTickLower= */ 240000,
        /* newPositionTickUpper= */ 300000,
        /* slippageTolerance= */ 0.01,
        /* tokenPricesUsd= */ ['60000', '3000'],
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
      /* newPositionTickLower= */ 240000,
      /* newPositionTickUpper= */ 300000,
      /* slippageTolerance= */ new Percent(1, 100),
      /* deadlineEpochSeconds =*/ BigInt(Math.floor(Date.now() / 1000)),
      publicClient,
      swapData,
      liquidity,
      /* feeBips= */ 0n,
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

  it('Optimal mint without 1inch', async function () {
    const pool = await getPool(
      '0x4200000000000000000000000000000000000006', // WETH on Base mainnet,
      '0x940181a94A35A4569E4529A3CDfB74e38FD98631', // AERO on Base mainnet,
      /* feeOrTickSpacing= */ 200,
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
    // 1 WETH and 1 AERO.
    const token0Amount = CurrencyAmount.fromRawAmount(
      pool.token0,
      '1000000000000000000',
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
      await getMintOptimalSwapInfo(
        chainId,
        amm,
        token0Amount,
        token1Amount,
        pool.tickSpacing,
        tickLower,
        tickUpper,
        eoa,
        /* slippage= */ 0.5,
        publicClient,
        [E_Solver.SamePool],
      )
    )[0];
    const { tx: txRequest } = await getMintOptimalTx(
      chainId,
      amm,
      token0Amount,
      token1Amount,
      pool.tickSpacing,
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
      tickSpacing: pool.tickSpacing,
      tickLower,
      tickUpper,
      liquidity: '645125816475133179687',
    });
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
      '1000000000000000000',
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
    expect(existingPosition.liquidity).to.equal('13589538797482293814');
    expect(newPosition).to.deep.equal({
      token0: pool.token0,
      token1: pool.token1,
      fee: pool.fee,
      tickSpacing: pool.tickSpacing,
      tickLower: existingPosition.tickLower,
      tickUpper: existingPosition.tickUpper,
      liquidity: '3825661781316041551568',
    });
  });
});
