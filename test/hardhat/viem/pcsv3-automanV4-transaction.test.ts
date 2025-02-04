// yarn test:hardhat test/hardhat/viem/pcsv3-automanV4-transaction.test.ts
import { FeeAmount, nearestUsableTick } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import hre, { ethers } from 'hardhat';
import {
  Address,
  PublicClient,
  TestClient,
  WalletClient,
  createPublicClient,
  encodeAbiParameters,
  http,
  parseAbiParameters,
  parseEther,
  walletActions,
} from 'viem';
import { bsc, mainnet } from 'viem/chains';

import {
  ActionTypeEnum,
  ApertureSupportedChainId,
  ConditionTypeEnum,
  ConsoleLogger,
  ICommonNonfungiblePositionManager__factory,
  IOCKEY_LOGGER,
  PCSV3AutomanV4,
  PCSV3AutomanV4__factory,
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
import { expect, hardhatForkProvider, resetFork } from '../common';

// Tests for PCSV3AutomanV4 transactions on a forked BNB mainnet.
describe('Viem - PCSV3AutomanV4 transaction tests', function () {
  const amm = AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3;
  const chainId = ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID;
  const WHALE_ADDRESS = '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3';
  const positionId = 528336n;
  const blockNumber = 37287100n;
  const eoa = '0x4B104b883104d17E618d84f766d0be06F6F6f486';

  const WETH_ADDRESS = '0x2170Ed0880ac9A755fd29B2688956BD959F933F8';
  const WBTC_ADDRESS = '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c';

  let automanV4Contract: PCSV3AutomanV4;
  const automanV4Address = getAMMInfo(chainId, amm)!.apertureAutomanV4;
  const feeCollector = WHALE_ADDRESS;
  let testClient: TestClient;
  let publicClient: PublicClient;
  let impersonatedOwnerClient: WalletClient;
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);
  const nonForkClient = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-rpc.publicnode.com'),
  });

  beforeEach(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();

    await resetFork(testClient, blockNumber, chainId);
    await testClient.impersonateAccount({
      address: eoa,
    });
    impersonatedOwnerClient = testClient.extend(walletActions);

    // Deploy AutomanV4.
    automanV4Contract = await new PCSV3AutomanV4__factory(
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

    // Owner of position id 528336 sets AutomanV4 as operator.
    const { request } = await publicClient.simulateContract({
      abi: ICommonNonfungiblePositionManager__factory.abi,
      address: getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      functionName: 'setApprovalForAll',
      args: [automanV4Contract.address as Address, true] as const,
      account: eoa,
    });

    await testClient.setBalance({
      address: eoa,
      value: parseEther('1'),
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
    const [token0Overrides, token1Overrides] = await Promise.all([
      getERC20Overrides(token0, from, to, amount0, nonForkClient),
      getERC20Overrides(token1, from, to, amount1, nonForkClient),
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
    expect(liquidityBeforeReinvest.toString()).to.equal('17360687214921889114');

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
    expect(liquidityAfterReinvest.toString()).to.equal('17369508569204326673');

    expect(
      generateAutoCompoundRequestPayload(
        eoa,
        chainId,
        AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3,
        positionId.toString(),
        /* feeToPrincipalRatioThreshold= */ 0.1,
        /* slippage= */ 0.05,
        /* maxGasProportion= */ 0.01,
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
      await getRebalanceSwapInfoV4(
        chainId,
        amm,
        publicClient,
        eoa,
        existingPosition,
        /* newPositionTickLower= */ 240000,
        /* newPositionTickUpper= */ 300000,
        /* slippageTolerance= */ 0.01,
        /* tokenPricesUsd= */ ['1', '700'], // BSC-USD / WBNB
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
      tickSpacing: 10,
      liquidity: '15250213564999769681912914',
      tickLower: 240000,
      tickUpper: 300000,
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
      getAMMInfo(chainId, amm)!.apertureAutomanV4,
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
        /* tokenPricesUsd= */ ['3000', '60000'],
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
        /* tokenPricesUsd= */ ['1', '700'], // BSC-USD / WBNB
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
  });

  // TODO: Add tests for rebalance, mintOptimal and increaseLiquidityOptimal with 1inch.
});
