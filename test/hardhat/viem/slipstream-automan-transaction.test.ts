/**
 * SlipStream Automan Transaction Tests
 *
 * To run these tests:
 * yarn test:hardhat test/hardhat/viem/slipstream-automan-transaction.test.ts
 */
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
  parseEther,
  walletActions,
} from 'viem';
import { mainnet } from 'viem/chains';

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
import {
  expect,
  getApiClient,
  hardhatForkProvider,
  resetFork,
} from '../common';

// TODO: Unify test cases for all AMMs (UniV3, PCSV3 and SlipStream).

/**
 * Tests for SlipStreamAutoman transactions on a forked Base mainnet.
 */
describe('SlipStreamAutoman transaction tests', () => {
  // Test configuration constants
  const amm = AutomatedMarketMakerEnum.enum.SLIPSTREAM;
  const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;
  const blockNumber = 17839113n;
  const positionId = 13465n;

  // Account addresses
  const eoa = '0xeF1Ce5fddd0a1cb903b49608F6e1A37199DCf2a6'; // Owner of position id `positionId` as of `blockNumber`
  const WHALE_ADDRESS = '0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A'; // Binance hot wallet with large ETH/USDC holdings

  // Contract and client variables
  let automanContract: SlipStreamAutoman;
  const automanAddress = getAMMInfo(chainId, amm)!.apertureAutoman;
  let testClient: TestClient;
  let publicClient: PublicClient;
  let impersonatedOwnerClient: WalletClient;
  const nonForkClient = getApiClient(chainId);

  // Register logger
  ioc.registerSingleton(IOCKEY_LOGGER, ConsoleLogger);

  beforeEach(async () => {
    // Setup test environment
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient, blockNumber, chainId);
    await testClient.impersonateAccount({ address: eoa });
    impersonatedOwnerClient = testClient.extend(walletActions);

    // Deploy Automan contract
    const impersonatedWhaleSigner =
      await ethers.getImpersonatedSigner(WHALE_ADDRESS);

    // Deploy the SlipStreamAutoman contract
    automanContract = await new SlipStreamAutoman__factory(
      impersonatedWhaleSigner,
    ).deploy(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      WHALE_ADDRESS, // owner
    );
    await automanContract.deployed();

    // Configure the Automan contract
    await automanContract.setFeeConfig({
      feeCollector: WHALE_ADDRESS,
      feeLimitPips: BigNumber.from('500000000000000000'), // 50% max fee deduction
    });
    await automanContract.setControllers([WHALE_ADDRESS], [true]);

    // Deploy and configure the router
    const router = await new SlipStreamOptimalSwapRouter__factory(
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(getAMMInfo(chainId, amm)!.nonfungiblePositionManager);
    await router.deployed();
    await automanContract.setSwapRouters([router.address], [true]);

    // Update AMM info with deployed contract addresses
    getAMMInfo(chainId, amm)!.apertureAutoman =
      automanContract.address as `0x${string}`;
    getAMMInfo(chainId, amm)!.optimalSwapRouter =
      router.address as `0x${string}`;

    // Set Automan as operator for EOA
    const { request } = await publicClient.simulateContract({
      abi: ICommonNonfungiblePositionManager__factory.abi,
      address: getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      functionName: 'setApprovalForAll',
      args: [automanContract.address as Address, true] as const,
      account: eoa,
    });

    // Fund EOA with ETH
    await impersonatedWhaleSigner.sendTransaction({
      to: eoa,
      value: parseEther('1'),
    });

    // Execute the approval transaction
    await impersonatedOwnerClient.writeContract(request);
  });

  after(() => {
    // Cleanup
    getAMMInfo(chainId, amm)!.apertureAutoman = automanAddress;
    testClient.stopImpersonatingAccount({ address: eoa });
  });

  /**
   * Helper function to deal ERC20 tokens to accounts
   */
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

    // Set storage for token0
    for (const slot of Object.keys(token0Overrides[token0].stateDiff!)) {
      await hardhatForkProvider.send('hardhat_setStorageAt', [
        token0,
        slot,
        defaultAbiCoder.encode(['uint256'], [amount0]),
      ]);
    }

    // Set storage for token1
    for (const slot of Object.keys(token1Overrides[token1].stateDiff!)) {
      await hardhatForkProvider.send('hardhat_setStorageAt', [
        token1,
        slot,
        defaultAbiCoder.encode(['uint256'], [amount1]),
      ]);
    }
  }

  /**
   * Test case for reinvesting fees back into the position
   */
  it('should successfully reinvest fees back into the position', async () => {
    // Get initial position liquidity
    const liquidityBeforeReinvest = (
      await getBasicPositionInfo(chainId, amm, positionId, publicClient)
    ).liquidity!;

    // Prepare reinvest transaction
    const txRequest = await getReinvestTx(
      chainId,
      amm,
      eoa,
      {
        tokenId: positionId.toString(),
        slippageTolerance: new Percent(1, 100),
        deadline: Math.floor(Date.now() / 1000),
      },
      0n, // feeBips
      '0x', // swapData
      0n, // amount0Min
      0n, // amount1Min
    );

    // Execute reinvest transaction
    await impersonatedOwnerClient.sendTransaction({
      ...txRequest,
      account: eoa,
      chain: mainnet,
    });

    // Get updated position liquidity
    const liquidityAfterReinvest = (
      await getBasicPositionInfo(chainId, amm, positionId, publicClient)
    ).liquidity!;

    // Verify liquidity increased after reinvesting
    expect(liquidityBeforeReinvest.toString()).to.equal('13589538797482293814');
    expect(liquidityAfterReinvest.toString()).to.equal('14018556727424907792');

    // Verify auto-compound payload generation is correct
    const autoCompoundPayload = generateAutoCompoundRequestPayload(
      eoa,
      chainId,
      AutomatedMarketMakerEnum.enum.SLIPSTREAM,
      positionId.toString(),
      0.1, // feeToPrincipalRatioThreshold
      0.05, // slippage
      0.01, // maxGasProportion
      1627776000, // expiration
    );

    expect(autoCompoundPayload).to.deep.equal({
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

  /**
   * Test case for rebalancing a position to new tick ranges
   */
  it('should successfully rebalance a position to new tick ranges', async () => {
    // Get existing position details
    const existingPosition = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      publicClient,
    );

    // New position parameters
    const newTickLower = 78600;
    const newTickUpper = 79400;

    // Get rebalance swap information
    const { swapData, liquidity } = (
      await getRebalanceSwapInfo(
        chainId,
        amm,
        eoa,
        positionId,
        newTickLower,
        newTickUpper,
        0.01, // slippageTolerance
        ['60000', '3000'], // tokenPricesUsd
        publicClient,
        [E_Solver.SamePool],
        existingPosition,
        undefined,
        false,
      )
    )[0];

    // Prepare rebalance transaction
    const { tx: txRequest } = await getRebalanceTx(
      chainId,
      amm,
      eoa,
      positionId,
      newTickLower,
      newTickUpper,
      new Percent(1, 100), // slippageTolerance
      BigInt(Math.floor(Date.now() / 1000)), // deadlineEpochSeconds
      publicClient,
      swapData,
      liquidity,
      0n, // feeBips
      existingPosition.position,
    );

    // Execute rebalance transaction
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      chain: walletClient.chain,
    });

    // Get transaction receipt and new position ID
    const txReceipt = await publicClient.getTransactionReceipt({
      hash: txHash,
    });
    const newPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      amm,
      txReceipt,
      eoa,
    )!;

    // Verify new position details
    const newPositionInfo = await getBasicPositionInfo(
      chainId,
      amm,
      newPositionId,
      publicClient,
    );
    expect(newPositionInfo).to.deep.equal({
      token0: existingPosition.pool.token0,
      token1: existingPosition.pool.token1,
      fee: existingPosition.pool.fee,
      tickSpacing: existingPosition.pool.tickSpacing,
      liquidity: '7008927949436597297',
      tickLower: newTickLower,
      tickUpper: newTickUpper,
    });
  });

  /**
   * Test case for rebalancing a position using 1inch for optimal swaps
   * Note: This test is skipped due to flakiness caused by mismatch between forked state and live network state
   * TODO: Make this test stable and enable it for all AMMs
   */
  it.skip('should successfully rebalance a position using 1inch for optimal swaps', async () => {
    // Get existing position details
    const existingPosition = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      publicClient,
    );

    // New position parameters
    const newTickLower = 240000;
    const newTickUpper = 300000;

    // Get rebalance swap information using 1inch solver
    const { swapData, liquidity } = (
      await getRebalanceSwapInfo(
        chainId,
        amm,
        eoa,
        positionId,
        newTickLower,
        newTickUpper,
        0.01, // slippageTolerance
        ['60000', '3000'], // tokenPricesUsd
        publicClient,
        [E_Solver.OneInch], // Use 1inch for swaps
        existingPosition,
        undefined,
        false,
      )
    )[0];

    // Prepare rebalance transaction
    const { tx: txRequest } = await getRebalanceTx(
      chainId,
      amm,
      eoa,
      positionId,
      newTickLower,
      newTickUpper,
      new Percent(1, 100), // slippageTolerance
      BigInt(Math.floor(Date.now() / 1000)), // deadlineEpochSeconds
      publicClient,
      swapData,
      liquidity,
      0n, // feeBips
      existingPosition.position,
    );

    // Execute rebalance transaction
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      chain: walletClient.chain,
    });

    // Get transaction receipt and new position ID
    const txReceipt = await publicClient.getTransactionReceipt({
      hash: txHash,
    });
    const newPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      amm,
      txReceipt,
      eoa,
    )!;

    // Verify new position details
    const newPositionInfo = await getBasicPositionInfo(
      chainId,
      amm,
      newPositionId,
      publicClient,
    );
    expect(newPositionInfo).to.deep.contains({
      token0: existingPosition.pool.token0,
      token1: existingPosition.pool.token1,
      fee: existingPosition.pool.fee,
      tickSpacing: existingPosition.pool.tickSpacing,
      tickLower: newTickLower,
      tickUpper: newTickUpper,
    });
  });

  /**
   * Test case for minting a new position with optimal token ratio without using 1inch
   */
  it('should successfully mint a new position with optimal token ratio', async () => {
    // Get pool information for WETH-AERO pair
    const pool = await getPool(
      '0x4200000000000000000000000000000000000006', // WETH on Base mainnet
      '0x940181a94A35A4569E4529A3CDfB74e38FD98631', // AERO on Base mainnet
      200, // feeOrTickSpacing
      chainId,
      amm,
      publicClient,
    );

    // Calculate tick range around current price
    const tickLower = nearestUsableTick(
      pool.tickCurrent - 1000,
      pool.tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      pool.tickCurrent + 1000,
      pool.tickSpacing,
    );

    // Prepare token amounts (1 WETH and 1 AERO)
    const token0Amount = CurrencyAmount.fromRawAmount(
      pool.token0,
      '1000000000000000000',
    );
    const token1Amount = CurrencyAmount.fromRawAmount(
      pool.token1,
      '1000000000000000000',
    );

    // Deal tokens to Automan contract
    await dealERC20(
      pool.token0.address as Address,
      pool.token1.address as Address,
      BigInt(token0Amount.quotient.toString()),
      BigInt(token1Amount.quotient.toString()),
      eoa,
      getAMMInfo(chainId, amm)!.apertureAutoman,
    );

    // Get optimal swap information for minting
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
        0.5, // slippage
        publicClient,
        [E_Solver.SamePool],
      )
    )[0];

    // Prepare mint transaction
    const { tx: txRequest } = await getMintOptimalTx(
      chainId,
      amm,
      token0Amount,
      token1Amount,
      pool.tickSpacing,
      tickLower,
      tickUpper,
      eoa,
      BigInt(Math.floor(Date.now() / 1000)), // deadlineEpochSeconds
      0.5, // slippage
      publicClient,
      swapData,
      liquidity,
    );

    // Execute mint transaction
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      chain: walletClient.chain,
    });

    // Get transaction receipt and new position ID
    const txReceipt = await publicClient.getTransactionReceipt({
      hash: txHash,
    });
    const newPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      amm,
      txReceipt,
      eoa,
    )!;

    // Verify new position details
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

  /**
   * Test case for increasing liquidity of an existing position with optimal token ratio
   */
  it('should successfully increase liquidity of an existing position with optimal token ratio', async () => {
    // Get existing position details
    const existingPosition = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      publicClient,
    );
    const pool = existingPosition.pool;

    // Prepare token amounts (1 of each token)
    const token0Amount = CurrencyAmount.fromRawAmount(
      pool.token0,
      '1000000000000000000',
    );
    const token1Amount = CurrencyAmount.fromRawAmount(
      pool.token1,
      '1000000000000000000',
    );

    // Deal tokens to Automan contract
    await dealERC20(
      pool.token0.address as Address,
      pool.token1.address as Address,
      BigInt(token0Amount.quotient.toString()),
      BigInt(token1Amount.quotient.toString()),
      eoa,
      getAMMInfo(chainId, amm)!.apertureAutoman,
    );

    // Options for increasing liquidity
    const increaseOptions = {
      tokenId: Number(positionId),
      slippageTolerance: new Percent(5, 1000), // 0.5%
      deadline: Math.floor(Date.now() / 1000 + 60 * 30), // 30 minutes from now
    };

    // Get optimal swap information for increasing liquidity
    const { swapData, liquidity } = (
      await getIncreaseLiquidityOptimalSwapInfo(
        increaseOptions,
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

    // Prepare increase liquidity transaction with higher slippage tolerance for test
    const txOptions = {
      tokenId: Number(positionId),
      slippageTolerance: new Percent(50, 100), // 50%
      deadline: Math.floor(Date.now() / 1000 + 60 * 30), // 30 minutes from now
    };

    const { tx: txRequest } = await getIncreaseLiquidityOptimalTx(
      txOptions,
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

    // Execute increase liquidity transaction
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const txHash = await walletClient.sendTransaction({
      to: txRequest.to,
      data: txRequest.data,
      account: txRequest.from,
      chain: walletClient.chain,
    });

    // Wait for transaction to complete
    await publicClient.getTransactionReceipt({
      hash: txHash,
    });

    // Get updated position details
    const newPosition = await getBasicPositionInfo(
      chainId,
      amm,
      positionId,
      publicClient,
    );

    // Verify original liquidity value
    expect(existingPosition.liquidity).to.equal('13589538797482293814');

    // Verify position details after increasing liquidity
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
