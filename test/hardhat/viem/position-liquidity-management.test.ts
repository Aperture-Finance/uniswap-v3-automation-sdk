import { FeeAmount, Position } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import hre, { ethers } from 'hardhat';
import {
  GetContractReturnType,
  PublicClient,
  TestClient,
  getContract,
} from 'viem';

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
import {
  WBTC_ADDRESS,
  WETH_ADDRESS,
  UNIV3_AMM as amm,
  chainId,
  eoa,
  expect,
  resetFork,
} from '../common';

describe('UniV3 non-Automan liquidity management tests', function () {
  const positionId = 4n;
  let WBTC: Token, WETH: Token;
  let testClient: TestClient;
  let publicClient: PublicClient;

  let wbtcContract: GetContractReturnType<
      typeof IERC20__factory.abi,
      PublicClient
    >,
    wethContract: GetContractReturnType<
      typeof IERC20__factory.abi,
      PublicClient
    >;

  let wbtcBalanceBefore: bigint,
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
    await resetFork(testClient, 17188000n);

    wbtcContract = getContract({
      address: WBTC_ADDRESS,
      abi: IERC20__factory.abi,
      client: publicClient,
    });

    wethContract = getContract({
      address: WETH_ADDRESS,
      abi: IERC20__factory.abi,
      client: publicClient,
    });

    wbtcBalanceBefore = await wbtcContract.read.balanceOf([eoa]);
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
    );

    WBTC = await getToken(WBTC_ADDRESS, chainId, publicClient);
    WETH = await getToken(WETH_ADDRESS, chainId, publicClient);
  });

  beforeEach(async function () {
    await resetFork(testClient, 17188000n);
  });

  it('Collect fees', async function () {
    const txRequest = await getCollectTx(
      positionId,
      eoa,
      chainId,
      amm,
      publicClient,
      false,
      position4BasicInfo,
    );

    const eoaSigner = await ethers.getImpersonatedSigner(eoa);
    const txReceipt = await (await eoaSigner.sendTransaction(txRequest)).wait();

    const collectedFees = getCollectedFeesFromReceipt(
      txReceipt,
      position4BasicInfo.token0,
      position4BasicInfo.token1,
    );
    expect(collectedFees).deep.equal(position4ColletableTokenAmounts);
    expect(await wbtcContract.read.balanceOf([eoa])).to.equal(
      wbtcBalanceBefore +
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

  it('Decrease liquidity (receive native ether + WBTC), increase liquidity, and create position', async function () {
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
    const eoaSigner = await ethers.getImpersonatedSigner(eoa);
    const removeLiquidityTxReceipt = await (
      await eoaSigner.sendTransaction(removeLiquidityTxRequest)
    ).wait();
    const collectedFees = getCollectedFeesFromReceipt(
      removeLiquidityTxReceipt,
      position4BasicInfo.token0,
      position4BasicInfo.token1,
    );
    expect(collectedFees).deep.equal(position4ColletableTokenAmounts);
    expect(await wbtcContract.read.balanceOf([eoa])).to.equal(
      wbtcBalanceBefore +
        // Add collected WBTC fees.
        BigInt(
          position4ColletableTokenAmounts.token0Amount.quotient.toString(),
        ) +
        // Add withdrawn WBTC liquidity.
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
          removeLiquidityTxReceipt.gasUsed.mul(
            removeLiquidityTxReceipt.effectiveGasPrice,
          ),
        ),
    );

    // ------- Add Liquidity -------
    // We now start to add some liquidity to position id 4.
    // This involves three steps:
    // (1) Figure out the amount of liquidity that can be minted with the provided amounts of the two tokens.
    // (2) Approve the two tokens for Uniswap NPM contract to spend, if necessary.
    // (3) Send out the tx that adds liquidity.

    // Here we want to provide 1 WETH along with the necessary WBTC amount.
    const oneWETH = getCurrencyAmount(WETH, '1');
    // We find the necessary amount of WBTC to pair with 1 WETH.
    // Since WETH is token1 in the pool, we use `Position.fromAmount1()`.
    const wbtcRawAmount = Position.fromAmount1({
      pool: position.pool,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      amount1: oneWETH.quotient,
    }).mintAmounts.amount0;
    // Now we find the liquidity amount that can be added by providing 1 WETH and `wbtcRawAmount` of WBTC.
    const liquidityToAdd = Position.fromAmounts({
      pool: position.pool,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      amount0: oneWETH.quotient,
      amount1: wbtcRawAmount,
      useFullPrecision: false,
    }).liquidity;

    // Approve Uniswap NPM to spend WBTC. Since we are providing native ether in this example, we don't need to approve WETH.
    await IERC20__factory.connect(WBTC_ADDRESS, eoaSigner).approve(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      wbtcRawAmount.toString(),
    );

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
    await (await eoaSigner.sendTransaction(addLiquidityTxRequest)).wait();
    expect(
      (await getBasicPositionInfo(chainId, amm, positionId, publicClient))
        .liquidity!,
    ).to.equal(liquidityToAdd.toString());

    // ------- Create Position -------
    // Now we create a new WBTC-WETH position.
    // We wish to provide liquidity to the 12.5 ~ 27.5 WETH per WBTC price range, to the HIGH fee-tier pool.
    // And we want to provide 0.1 WBTC paired with the necessary amount of WETH.

    // First, we align the price range's endpoints.
    const poolFee = FeeAmount.HIGH;
    const alignedPriceLower = alignPriceToClosestUsableTick(
      parsePrice(WBTC, WETH, '12.5'),
      poolFee,
    );
    const alignedPriceUpper = alignPriceToClosestUsableTick(
      parsePrice(WBTC, WETH, '27.5'),
      poolFee,
    );
    expect(alignedPriceLower.toFixed(6)).to.equal('12.589601');
    expect(alignedPriceUpper.toFixed(6)).to.equal('27.462794');

    // Second, we construct the `Position` object for the position we want to create.
    // We want to provide 0.1 WBTC and the necessary amount of WETH.
    const wbtcAmount = getCurrencyAmount(WBTC, '0.1');
    const tickLower = priceToClosestUsableTick(alignedPriceLower, poolFee);
    const tickUpper = priceToClosestUsableTick(alignedPriceUpper, poolFee);
    const pool = await getPool(WBTC, WETH, poolFee, chainId, amm, publicClient);
    // Since WBTC is token0, we use `Position.fromAmount0()`.
    const positionToCreate = Position.fromAmount0({
      pool,
      tickLower,
      tickUpper,
      amount0: wbtcAmount.quotient,
      useFullPrecision: false,
    });
    // Now we know that we need to provide 0.1 WBTC and 0.568256298587835347 WETH.
    expect(
      CurrencyAmount.fromRawAmount(
        WBTC,
        positionToCreate.mintAmounts.amount0,
      ).toExact(),
    ).to.equal('0.1');
    expect(
      CurrencyAmount.fromRawAmount(
        WETH,
        positionToCreate.mintAmounts.amount1,
      ).toExact(),
    ).to.equal('0.568256298587835347');

    // Approve Uniswap NPM to spend WBTC.
    await IERC20__factory.connect(WBTC_ADDRESS, eoaSigner).approve(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      positionToCreate.mintAmounts.amount0.toString(),
    );

    // Approve Uniswap NPM to spend WETH.
    await WETH__factory.connect(WETH_ADDRESS, eoaSigner).deposit({
      value: positionToCreate.mintAmounts.amount1.toString(),
    });
    await WETH__factory.connect(WETH_ADDRESS, eoaSigner).approve(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      positionToCreate.mintAmounts.amount1.toString(),
    );

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
    const createPositionTxReceipt = await (
      await eoaSigner.sendTransaction(createPositionTxRequest)
    ).wait();
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
      token0: WBTC,
      token1: WETH,
      tickSpacing: positionToCreate.pool.tickSpacing,
    });
  });
});
