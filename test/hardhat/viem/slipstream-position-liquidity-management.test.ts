import { FeeAmount, Position } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import hre from 'hardhat';
import {
  Address,
  GetContractReturnType,
  PublicClient,
  TestClient,
  WalletClient,
  getContract,
  walletActions,
} from 'viem';
import { base } from 'viem/chains';

import {
  IERC20__factory,
  WETH__factory,
  alignPriceToClosestUsableTick,
  getAMMInfo,
  parsePrice,
  priceToClosestUsableTick,
} from '../../../src';
import {
  BasicPositionInfo,
  getAddLiquidityTx,
  getBasicPositionInfo,
  getCollectTx,
  getCollectedFeesFromReceipt,
  getCreatePositionTx,
  getCurrencyAmount,
  getMintedPositionIdFromTxReceipt,
  getNativeCurrency,
  getPool,
  getPositionFromBasicInfo,
  getRemoveLiquidityTx,
  getToken,
  viewCollectableTokenAmounts,
} from '../../../src/viem';
import { UNIV3_AMM as amm, chainId, expect, resetFork } from '../common';

const eoa = '0xFf09eE65939bF6cfcB1aA44D7Fe0C237CB9ccBAb';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';

describe('Viem - Aerodrome Slipstream Position liquidity management tests', function () {
  const positionId = 293613n;
  const blockNumber = 17775451n;
  let USDC: Token, WETH: Token;
  let testClient: TestClient;
  let publicClient: PublicClient;
  let impersonatedOwnerClient: WalletClient;

  let usdtContract: GetContractReturnType<
      typeof IERC20__factory.abi,
      PublicClient
    >,
    wethContract: GetContractReturnType<
      typeof IERC20__factory.abi,
      PublicClient
    >;

  let usdcBalanceBefore: bigint,
    wethBalanceBefore: bigint,
    nativeEtherBalanceBefore: bigint;
  let position4BasicInfo: BasicPositionInfo;
  let position4ColletableTokenAmounts: {
    token0Amount: CurrencyAmount<Token>;
    token1Amount: CurrencyAmount<Token>;
  };

  before(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();

    // resetFork(
    //   testClient,
    //   blockNumber,
    //   'https://base-mainnet.g.alchemy.com/v2/MpxnCbzEh385Sd2xMzXVipRtSDCukug-',
    // );

    usdtContract = getContract({
      address: USDC_ADDRESS,
      abi: IERC20__factory.abi,
      client: publicClient,
    });

    wethContract = getContract({
      address: WETH_ADDRESS,
      abi: IERC20__factory.abi,
      client: publicClient,
    });

    usdcBalanceBefore = await usdtContract.read.balanceOf([eoa]);
    wethBalanceBefore = await wethContract.read.balanceOf([eoa]);
    nativeEtherBalanceBefore = await publicClient.getBalance({
      address: eoa,
    });
    position4BasicInfo = await getBasicPositionInfo(
      chainId,
      amm,
      positionId,
      publicClient,
    );

    position4ColletableTokenAmounts = await viewCollectableTokenAmounts(
      chainId,
      amm,
      positionId,
      publicClient,
      position4BasicInfo,
    );

    USDC = await getToken(USDC_ADDRESS, chainId, publicClient);
    WETH = await getToken(WETH_ADDRESS, chainId, publicClient);
  });

  beforeEach(async function () {
    // resetFork(
    //   testClient,
    //   blockNumber,
    //   'https://base-mainnet.g.alchemy.com/v2/MpxnCbzEh385Sd2xMzXVipRtSDCukug-',
    // );

    await testClient.impersonateAccount({
      address: eoa,
    });
    impersonatedOwnerClient = testClient.extend(walletActions);
  });

  it('Slipstream Collect fees', async function () {
    const txRequest = await getCollectTx(
      positionId,
      eoa,
      chainId,
      amm,
      publicClient,
      false,
      position4BasicInfo,
    );

    const txReceipt = await publicClient.getTransactionReceipt({
      hash: await impersonatedOwnerClient.sendTransaction({
        ...txRequest,
        account: eoa,
        chain: base,
      }),
    });

    const collectedFees = getCollectedFeesFromReceipt(
      txReceipt,
      position4BasicInfo.token0,
      position4BasicInfo.token1,
    );
    expect(collectedFees).deep.equal(position4ColletableTokenAmounts);
    expect(await usdtContract.read.balanceOf([eoa])).to.equal(
      usdcBalanceBefore +
        BigInt(
          position4ColletableTokenAmounts.token0Amount.quotient.toString(),
        ),
    );
    expect(await wethContract.read.balanceOf([eoa])).to.equal(
      wethBalanceBefore +
        BigInt(
          position4ColletableTokenAmounts.token1Amount.quotient.toString(),
        ),
    );
  });

  it.skip('Decrease liquidity (receive native ether + USDC), increase liquidity, and create position', async function () {
    // ------- Decrease Liquidity -------
    // Decrease liquidity from position id 4.
    const position = await getPositionFromBasicInfo(
      position4BasicInfo,
      chainId,
      amm,
      publicClient,
    );
    const liquidityPercentage = new Percent(1); // 100%
    const removeLiquidityTxRequest = await getRemoveLiquidityTx(
      {
        tokenId: positionId.toString(),
        liquidityPercentage,
        slippageTolerance: new Percent(0),
        deadline: Math.floor(Date.now() / 1000),
      },
      eoa,
      chainId,
      amm,
      publicClient,
      /*receiveNativeEtherIfApplicable=*/ true,
      position,
    );

    const removeLiquidityTxReceipt = await publicClient.getTransactionReceipt({
      hash: await impersonatedOwnerClient.sendTransaction({
        ...removeLiquidityTxRequest,
        account: eoa,
        chain: base,
      }),
    });

    const collectedFees = getCollectedFeesFromReceipt(
      removeLiquidityTxReceipt,
      position4BasicInfo.token0,
      position4BasicInfo.token1,
    );
    expect(collectedFees).deep.equal(position4ColletableTokenAmounts);
    expect(await usdtContract.read.balanceOf([eoa])).to.equal(
      usdcBalanceBefore +
        // Add collected USDC fees.
        BigInt(
          position4ColletableTokenAmounts.token0Amount.quotient.toString(),
        ) +
        // Add withdrawn USDC liquidity.
        BigInt(position.amount0.quotient.toString()),
    );
    expect(
      await publicClient.getBalance({
        address: eoa,
      }),
    ).to.equal(
      nativeEtherBalanceBefore +
        // Add collected WETH fees.
        BigInt(
          position4ColletableTokenAmounts.token1Amount.quotient.toString(),
        ) +
        // Add withdrawn WETH liquidity.
        BigInt(position.amount1.quotient.toString()) -
        // Subtract gas paid in ETH.
        BigInt(
          removeLiquidityTxReceipt.gasUsed *
            removeLiquidityTxReceipt.effectiveGasPrice,
        ),
    );

    // ------- Add Liquidity -------
    // We now start to add some liquidity to position id 4.
    // This involves three steps:
    // (1) Figure out the amount of liquidity that can be minted with the provided amounts of the two tokens.
    // (2) Approve the two tokens for Uniswap NPM contract to spend, if necessary.
    // (3) Send out the tx that adds liquidity.

    // Here we want to provide 1 WETH along with the necessary USDC amount.
    const oneWETH = getCurrencyAmount(WETH, '1');
    // We find the necessary amount of USDC to pair with 1 WETH.
    // Since WETH is token1 in the pool, we use `Position.fromAmount1()`.
    const usdcRawAmount = Position.fromAmount1({
      pool: position.pool,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      amount1: oneWETH.quotient,
    }).mintAmounts.amount0;
    // Now we find the liquidity amount that can be added by providing 1 WETH and `usdcRawAmount` of USDC.
    const liquidityToAdd = Position.fromAmounts({
      pool: position.pool,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      amount0: oneWETH.quotient,
      amount1: usdcRawAmount,
      useFullPrecision: false,
    }).liquidity;

    // Approve Uniswap NPM to spend USDC. Since we are providing native ether in this example, we don't need to approve WETH.
    const { request } = await publicClient.simulateContract({
      abi: IERC20__factory.abi,
      address: USDC_ADDRESS,
      functionName: 'approve',
      args: [
        getAMMInfo(chainId, amm)!.nonfungiblePositionManager as Address,
        BigInt(usdcRawAmount.toString()),
      ] as const,
      account: eoa,
    });
    await impersonatedOwnerClient.writeContract(request);

    // We are now ready to generate and send out the add-liquidity tx.
    const addLiquidityTxRequest = await getAddLiquidityTx(
      {
        slippageTolerance: new Percent(0),
        deadline: Math.floor(Date.now() / 1000),
        tokenId: positionId.toString(),
        // Note that `useNative` can be set to true when WETH is one of the two tokens, and the user chooses to provide native ether. Otherwise, this field can be undefined.
        useNative: getNativeCurrency(chainId),
      },
      chainId,
      amm,
      eoa,
      publicClient,
      liquidityToAdd.toString(),
      position,
    );

    await impersonatedOwnerClient.sendTransaction({
      ...addLiquidityTxRequest,
      account: eoa,
      chain: base,
    });
    expect(
      (await getBasicPositionInfo(chainId, amm, positionId, publicClient))
        .liquidity!,
    ).to.equal(liquidityToAdd.toString());

    // ------- Create Position -------
    // Now we create a new USDC-WETH position.
    // We wish to provide liquidity to the 12.5 ~ 27.5 WETH per USDC price range, to the HIGH fee-tier pool.
    // And we want to provide 0.1 USDC paired with the necessary amount of WETH.

    // First, we align the price range's endpoints.
    const poolFee = FeeAmount.HIGH;
    const alignedPriceLower = alignPriceToClosestUsableTick(
      parsePrice(USDC, WETH, '12.5'),
      poolFee,
    );
    const alignedPriceUpper = alignPriceToClosestUsableTick(
      parsePrice(USDC, WETH, '27.5'),
      poolFee,
    );
    expect(alignedPriceLower.toFixed(6)).to.equal('12.589601');
    expect(alignedPriceUpper.toFixed(6)).to.equal('27.462794');

    // Second, we construct the `Position` object for the position we want to create.
    // We want to provide 0.1 USDC and the necessary amount of WETH.
    const usdcAmount = getCurrencyAmount(USDC, '0.1');
    const tickLower = priceToClosestUsableTick(alignedPriceLower, poolFee);
    const tickUpper = priceToClosestUsableTick(alignedPriceUpper, poolFee);
    const pool = await getPool(USDC, WETH, poolFee, chainId, amm, publicClient);
    // Since USDC is token1, we use `Position.fromAmount1()`.
    const positionToCreate = Position.fromAmount1({
      pool,
      tickLower,
      tickUpper,
      amount1: usdcAmount.quotient,
      // useFullPrecision: false,
    });
    // Now we know that we need to provide 0.1 USDC and 0.568256298587835347 WETH.
    expect(
      CurrencyAmount.fromRawAmount(
        USDC,
        positionToCreate.mintAmounts.amount0,
      ).toExact(),
    ).to.equal('0.1');
    expect(
      CurrencyAmount.fromRawAmount(
        WETH,
        positionToCreate.mintAmounts.amount1,
      ).toExact(),
    ).to.equal('0.568256298587835347');

    // Approve Uniswap NPM to spend USDC.
    const { request: approveUsdc } = await publicClient.simulateContract({
      abi: IERC20__factory.abi,
      address: USDC_ADDRESS,
      functionName: 'approve',
      args: [
        getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
        BigInt(positionToCreate.mintAmounts.amount0.toString()),
      ] as const,
      account: eoa,
    });
    await impersonatedOwnerClient.writeContract(approveUsdc);

    // Approve Uniswap NPM to spend WETH.
    const { request: depositWETH } = await publicClient.simulateContract({
      abi: WETH__factory.abi,
      address: WETH_ADDRESS,
      functionName: 'deposit',
      value: BigInt(positionToCreate.mintAmounts.amount1.toString()),
      account: eoa,
    });
    await impersonatedOwnerClient.writeContract(depositWETH);

    const { request: approveWETH } = await publicClient.simulateContract({
      abi: WETH__factory.abi,
      address: WETH_ADDRESS,
      functionName: 'approve',
      args: [
        getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
        BigInt(positionToCreate.mintAmounts.amount1.toString()),
      ],
      account: eoa,
    });
    await impersonatedOwnerClient.writeContract(approveWETH);

    // We are now ready to generate and send out the create-position tx.
    const createPositionTxRequest = await getCreatePositionTx(
      positionToCreate,
      {
        slippageTolerance: new Percent(5, 100),
        deadline: Math.floor(Date.now() / 1000),
        recipient: eoa,
      },
      chainId,
      amm,
      publicClient,
    );

    const createPositionTxReceipt = await publicClient.getTransactionReceipt({
      hash: await impersonatedOwnerClient.sendTransaction({
        ...createPositionTxRequest,
        account: eoa,
        chain: base,
      }),
    });

    const createdPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      amm,
      createPositionTxReceipt,
      eoa,
    )!;
    expect(
      await getBasicPositionInfo(chainId, amm, createdPositionId, publicClient),
    ).to.deep.equal({
      fee: positionToCreate.pool.fee,
      liquidity: positionToCreate.liquidity.toString(),
      tickLower: positionToCreate.tickLower,
      tickUpper: positionToCreate.tickUpper,
      token0: USDC,
      token1: WETH,
      tickSpacing: positionToCreate.pool.tickSpacing,
    });
  });
});
