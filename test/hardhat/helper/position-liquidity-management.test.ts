import { FeeAmount, Position } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

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
  getCollectableTokenAmounts,
  getCollectedFeesFromReceipt,
  getCreatePositionTx,
  getCurrencyAmount,
  getMintedPositionIdFromTxReceipt,
  getNativeCurrency,
  getPool,
  getPositionFromBasicInfo,
  getRemoveLiquidityTx,
  getToken,
} from '../../../src/helper';
import {
  WBTC_ADDRESS,
  WETH_ADDRESS,
  amm,
  chainId,
  eoa,
  expect,
  hardhatForkProvider,
  resetHardhatNetwork,
} from './common';

describe('Helper - Position liquidity management tests', function () {
  const positionId = 4;
  let WBTC: Token, WETH: Token;
  const wbtcContract = IERC20__factory.connect(
    WBTC_ADDRESS,
    hardhatForkProvider,
  );
  const wethContract = IERC20__factory.connect(
    WETH_ADDRESS,
    hardhatForkProvider,
  );
  let wbtcBalanceBefore: BigNumber,
    wethBalanceBefore: BigNumber,
    nativeEtherBalanceBefore: BigNumber;
  let position4BasicInfo: BasicPositionInfo;
  let position4ColletableTokenAmounts: {
    token0Amount: CurrencyAmount<Token>;
    token1Amount: CurrencyAmount<Token>;
  };

  before(async function () {
    await resetHardhatNetwork();
    wbtcBalanceBefore = await wbtcContract.balanceOf(eoa);
    wethBalanceBefore = await wethContract.balanceOf(eoa);
    nativeEtherBalanceBefore = await hardhatForkProvider.getBalance(eoa);
    position4BasicInfo = await getBasicPositionInfo(
      chainId,
      amm,
      positionId,
      hardhatForkProvider,
    );
    position4ColletableTokenAmounts = await getCollectableTokenAmounts(
      chainId,
      amm,
      positionId,
      hardhatForkProvider,
      position4BasicInfo,
    );

    WBTC = await getToken(WBTC_ADDRESS, chainId, hardhatForkProvider);
    WETH = await getToken(WETH_ADDRESS, chainId, hardhatForkProvider);
  });

  beforeEach(async function () {
    await resetHardhatNetwork();
  });

  it('Collect fees', async function () {
    const txRequest = await getCollectTx(
      positionId,
      eoa,
      chainId,
      amm,
      hardhatForkProvider,
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
    expect(
      (await wbtcContract.balanceOf(eoa)).eq(
        wbtcBalanceBefore.add(
          position4ColletableTokenAmounts.token0Amount.quotient.toString(),
        ),
      ),
    ).to.equal(true);
    expect(
      (await wethContract.balanceOf(eoa)).eq(
        wethBalanceBefore.add(
          position4ColletableTokenAmounts.token1Amount.quotient.toString(),
        ),
      ),
    ).to.equal(true);
  });

  it('Decrease liquidity (receive native ether + WBTC), increase liquidity, and create position', async function () {
    // ------- Decrease Liquidity -------
    // Decrease liquidity from position id 4.
    const position = await getPositionFromBasicInfo(
      position4BasicInfo,
      chainId,
      amm,
      hardhatForkProvider,
    );
    const liquidityPercentage = new Percent(1); // 100%
    const removeLiquidityTxRequest = await getRemoveLiquidityTx(
      {
        tokenId: positionId,
        liquidityPercentage,
        slippageTolerance: new Percent(0),
        deadline: Math.floor(Date.now() / 1000),
      },
      eoa,
      chainId,
      amm,
      hardhatForkProvider,
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
    expect(
      (await wbtcContract.balanceOf(eoa)).eq(
        wbtcBalanceBefore
          // Add collected WBTC fees.
          .add(position4ColletableTokenAmounts.token0Amount.quotient.toString())
          // Add withdrawn WBTC liquidity.
          .add(position.amount0.quotient.toString()),
      ),
    ).to.equal(true);
    expect(
      (await hardhatForkProvider.getBalance(eoa)).eq(
        nativeEtherBalanceBefore
          // Add collected WETH fees.
          .add(position4ColletableTokenAmounts.token1Amount.quotient.toString())
          // Add withdrawn WETH liquidity.
          .add(position.amount1.quotient.toString())
          // Subtract gas paid in ETH.
          .sub(
            removeLiquidityTxReceipt.gasUsed.mul(
              removeLiquidityTxReceipt.effectiveGasPrice,
            ),
          ),
      ),
    ).to.equal(true);

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
        tokenId: positionId,
        // Note that `useNative` can be set to true when WETH is one of the two tokens, and the user chooses to provide native ether. Otherwise, this field can be undefined.
        useNative: getNativeCurrency(chainId),
      },
      chainId,
      amm,
      hardhatForkProvider,
      liquidityToAdd,
      position,
    );
    await (await eoaSigner.sendTransaction(addLiquidityTxRequest)).wait();
    expect(
      (
        await getBasicPositionInfo(
          chainId,
          amm,
          positionId,
          hardhatForkProvider,
        )
      ).liquidity!,
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
    const pool = await getPool(
      WBTC,
      WETH,
      poolFee,
      chainId,
      amm,
      hardhatForkProvider,
    );
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
      hardhatForkProvider,
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
      await getBasicPositionInfo(
        chainId,
        amm,
        createdPositionId,
        hardhatForkProvider,
      ),
    ).to.deep.equal({
      fee: positionToCreate.pool.fee,
      liquidity: positionToCreate.liquidity.toString(),
      tickLower: positionToCreate.tickLower,
      tickUpper: positionToCreate.tickUpper,
      token0: WBTC,
      token1: WETH,
    });
  });
});
