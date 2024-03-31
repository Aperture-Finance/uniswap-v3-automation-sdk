import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import {
  FeeAmount,
  TICK_SPACINGS,
  priceToClosestTick,
  tickToPrice,
} from '@uniswap/v3-sdk';
import { ethers } from 'hardhat';

import {
  IERC20__factory,
  alignPriceToClosestUsableTick,
  getChainInfoAMM,
  parsePrice,
  priceToClosestTickSafe,
  tickToLimitOrderRange,
} from '../../../src';
import {
  generateLimitOrderCloseRequestPayloadAMM,
  getBasicPositionInfo,
  getCreatePositionTxForLimitOrder,
  getCurrencyAmount,
  getMintedPositionIdFromTxReceipt,
  getNativeCurrency,
  getPool,
  getPositionFromBasicInfo,
  getToken,
} from '../../../src/helper';
import {
  WBTC_ADDRESS,
  WETH_ADDRESS,
  WHALE_ADDRESS,
  chainId,
  deadline,
  eoa,
  expect,
  hardhatForkProvider,
  resetHardhatNetwork,
} from './common';

describe('Helper - Limit order tests', function () {
  let WBTC: Token, WETH: Token;
  const poolFee = FeeAmount.MEDIUM;

  before(async function () {
    await resetHardhatNetwork();
    WBTC = await getToken(WBTC_ADDRESS, chainId, hardhatForkProvider);
    WETH = await getToken(WETH_ADDRESS, chainId, hardhatForkProvider);
  });

  it('Selling WBTC for WETH', async function () {
    const price = parsePrice(WBTC, WETH, '10.234');
    expect(price.toFixed(6)).to.equal('10.234000');
    const tenWBTC = getCurrencyAmount(WBTC, '10.0');
    expect(price.quote(tenWBTC as CurrencyAmount<Token>).toExact()).to.equal(
      '102.34',
    );
    const alignedPrice = alignPriceToClosestUsableTick(price, poolFee);
    expect(alignedPrice.toFixed(9)).to.equal('10.205039374');
    await expect(
      getCreatePositionTxForLimitOrder(
        eoa,
        alignedPrice,
        tenWBTC,
        poolFee,
        deadline,
        chainId,
        hardhatForkProvider,
      ),
    ).to.be.rejectedWith('Specified limit price not applicable');

    const pool = await getPool(
      WETH,
      WBTC,
      poolFee,
      chainId,
      hardhatForkProvider,
    );
    const currentPrice = tickToPrice(
      pool.token0,
      pool.token1,
      pool.tickCurrent,
    );
    expect(currentPrice.toFixed(6)).to.be.equal('15.295542'); // 1 WBTC = 15.295542 WETH.
    const alignedLimitPrice = alignPriceToClosestUsableTick(
      parsePrice(WBTC, WETH, '16.16'),
      poolFee,
    );
    expect(alignedLimitPrice.toFixed(6)).to.be.equal('16.197527');
    const tx = await getCreatePositionTxForLimitOrder(
      eoa,
      alignedLimitPrice,
      tenWBTC,
      poolFee,
      deadline,
      chainId,
      hardhatForkProvider,
    );
    const npmAddress =
      getChainInfoAMM(chainId).UNISWAP.nonfungiblePositionManager;
    expect(tx).to.deep.equal({
      to: npmAddress,
      data: '0x883164560000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000000000000000000000000000000000000003f048000000000000000000000000000000000000000000000000000000000003f084000000000000000000000000000000000000000000000000000000003b9aca000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003b9aca0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004bd047ca72fa05f0b89ad08fe5ba5ccdc07dffbf00000000000000000000000000000000000000000000000000000000f3fd9d70',
      value: '0x00',
    });
    // Top up 10 WBTC to `eoa` from `impersonatedWhale`.
    const impersonatedWhale = await ethers.getImpersonatedSigner(WHALE_ADDRESS);
    await IERC20__factory.connect(WBTC.address, impersonatedWhale).transfer(
      eoa,
      tenWBTC.quotient.toString(),
    );
    const impersonatedEOA = await ethers.getImpersonatedSigner(eoa);
    await IERC20__factory.connect(WBTC.address, impersonatedEOA).approve(
      npmAddress,
      tenWBTC.quotient.toString(),
    );
    // Create the limit order position.
    const txReceipt = await (await impersonatedEOA.sendTransaction(tx)).wait();
    const positionId = getMintedPositionIdFromTxReceipt(
      chainId,
      txReceipt,
      eoa,
    )!;
    const basicPositionInfo = await getBasicPositionInfo(
      chainId,
      positionId,
      hardhatForkProvider,
    );
    const { tickLower, tickUpper } = tickToLimitOrderRange(
      priceToClosestTickSafe(alignedLimitPrice),
      poolFee,
    );
    expect(basicPositionInfo).to.deep.equal({
      token0: WBTC,
      token1: WETH,
      liquidity: '134361875488133608',
      tickLower,
      tickUpper,
      fee: poolFee,
    });
    const position = await getPositionFromBasicInfo(
      basicPositionInfo,
      chainId,
      hardhatForkProvider,
    );
    // The user actually provided 9.99999999 WBTC due to liquidity precision, i.e. 10 WBTC would have yielded the exact same liquidity amount of 134361875488133608.
    expect(position.amount0.quotient.toString()).to.equal('999999999');
    expect(position.amount1.quotient.toString()).to.equal('0');
    expect(
      generateLimitOrderCloseRequestPayloadAMM(
        eoa,
        chainId,
        'UNISWAP',
        positionId,
        alignedLimitPrice,
        /*maxGasProportion=*/ 0.2,
        /*expiration=*/ 1627776000,
      ),
    ).to.deep.equal({
      action: {
        inputTokenAddr: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        maxGasProportion: 0.2,
        type: 'LimitOrderClose',
      },
      chainId: 1,
      automatedMarketMaker: 'UNISWAP',
      condition: {
        type: 'TokenAmount',
        zeroAmountToken: 0,
      },
      nftId: '500511',
      ownerAddr: '0x4bD047CA72fa05F0B89ad08FE5Ba5ccdC07DFFBF',
      expiration: 1627776000,
    });
  });

  it('Selling WETH for WBTC', async function () {
    const tenWETH = getCurrencyAmount(WETH, '10');

    // The current price is 1 WBTC = 15.295542 WETH. Trying to sell WETH at 1 WETH = 1/18 WBTC is lower than the current price and therefore should be rejected.
    await expect(
      getCreatePositionTxForLimitOrder(
        eoa,
        alignPriceToClosestUsableTick(
          parsePrice(WBTC, WETH, '18').invert(),
          poolFee,
        ),
        tenWETH,
        poolFee,
        deadline,
        chainId,
        hardhatForkProvider,
      ),
    ).to.be.rejectedWith('Specified limit price not applicable');

    const alignedLimitPrice = alignPriceToClosestUsableTick(
      parsePrice(WBTC, WETH, '12.12').invert(),
      poolFee,
    );
    expect(alignedLimitPrice.toFixed(6)).to.be.equal('0.082342');
    const tx = await getCreatePositionTxForLimitOrder(
      eoa,
      alignedLimitPrice,
      tenWETH,
      poolFee,
      deadline,
      chainId,
      hardhatForkProvider,
    );
    const npmAddress =
      getChainInfoAMM(chainId).UNISWAP.nonfungiblePositionManager;
    expect(tx).to.deep.equal({
      to: npmAddress,
      data: '0x883164560000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000000000000000000000000000000000000003e508000000000000000000000000000000000000000000000000000000000003e54400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008ac7230489e7fe5900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008ac7230489e7fe590000000000000000000000004bd047ca72fa05f0b89ad08fe5ba5ccdc07dffbf00000000000000000000000000000000000000000000000000000000f3fd9d70',
      value: '0x00',
    });
    // Top up 10 WETH to `eoa` from `impersonatedWhale`.
    const impersonatedWhale = await ethers.getImpersonatedSigner(WHALE_ADDRESS);
    await IERC20__factory.connect(WETH.address, impersonatedWhale).transfer(
      eoa,
      tenWETH.quotient.toString(),
    );
    const impersonatedEOA = await ethers.getImpersonatedSigner(eoa);
    await IERC20__factory.connect(WETH.address, impersonatedEOA).approve(
      npmAddress,
      tenWETH.quotient.toString(),
    );
    // Create the limit order position.
    const txReceipt = await (await impersonatedEOA.sendTransaction(tx)).wait();
    const positionId = getMintedPositionIdFromTxReceipt(
      chainId,
      txReceipt,
      eoa,
    )!;
    const basicPositionInfo = await getBasicPositionInfo(
      chainId,
      positionId,
      hardhatForkProvider,
    );
    expect(basicPositionInfo).to.deep.equal({
      token0: WBTC,
      token1: WETH,
      liquidity: '9551241229311572',
      tickLower: priceToClosestTick(alignedLimitPrice),
      tickUpper: priceToClosestTick(alignedLimitPrice) + TICK_SPACINGS[poolFee],
      fee: poolFee,
    });
    const position = await getPositionFromBasicInfo(
      basicPositionInfo,
      chainId,
      hardhatForkProvider,
    );
    // The user actually provided 9.999999999999999576 WETH due to liquidity precision, i.e. 10 WETH would have yielded the exact same liquidity amount of 9551241229311572.
    expect(position.amount0.quotient.toString()).to.equal('0');
    expect(position.amount1.quotient.toString()).to.equal(
      '9999999999999999576',
    );
    expect(
      generateLimitOrderCloseRequestPayloadAMM(
        eoa,
        chainId,
        'UNISWAP',
        positionId,
        alignedLimitPrice,
        /*maxGasProportion=*/ 0.2,
        /*expiration=*/ 1627776000,
      ),
    ).to.deep.equal({
      action: {
        inputTokenAddr: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        maxGasProportion: 0.2,
        type: 'LimitOrderClose',
      },
      chainId: 1,
      automatedMarketMaker: 'UNISWAP',
      condition: {
        type: 'TokenAmount',
        zeroAmountToken: 1,
      },
      nftId: '500512',
      ownerAddr: '0x4bD047CA72fa05F0B89ad08FE5Ba5ccdC07DFFBF',
      expiration: 1627776000,
    });

    // Create another WETH -> WBTC limit order but provide native ether this time.
    const tenETH = getCurrencyAmount(getNativeCurrency(chainId), '10');
    const nativeEthTx = await getCreatePositionTxForLimitOrder(
      eoa,
      alignedLimitPrice,
      tenETH,
      poolFee,
      deadline,
      chainId,
      hardhatForkProvider,
    );
    expect(nativeEthTx).to.deep.equal({
      to: npmAddress,
      data: '0xac9650d800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000164883164560000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000000000000000000000000000000000000003e508000000000000000000000000000000000000000000000000000000000003e54400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008ac7230489e7fe5900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008ac7230489e7fe590000000000000000000000004bd047ca72fa05f0b89ad08fe5ba5ccdc07dffbf00000000000000000000000000000000000000000000000000000000f3fd9d7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000',
      value: '0x8ac7230489e7fe59',
    });
    const nativeEthTxReceipt = await (
      await impersonatedEOA.sendTransaction(nativeEthTx)
    ).wait();
    const nativeEthPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      nativeEthTxReceipt,
      eoa,
    )!;
    expect(
      await getBasicPositionInfo(
        chainId,
        nativeEthPositionId,
        hardhatForkProvider,
      ),
    ).to.deep.equal({
      token0: WBTC,
      token1: WETH,
      liquidity: '9551241229311572',
      tickLower: priceToClosestTick(alignedLimitPrice),
      tickUpper: priceToClosestTick(alignedLimitPrice) + TICK_SPACINGS[poolFee],
      fee: poolFee,
    });
    expect(
      generateLimitOrderCloseRequestPayloadAMM(
        eoa,
        chainId,
        'UNISWAP',
        nativeEthPositionId,
        alignedLimitPrice,
        /*maxGasProportion=*/ 0.2,
        /*expiration=*/ 1627776000,
      ),
    ).to.deep.equal({
      action: {
        inputTokenAddr: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        maxGasProportion: 0.2,
        type: 'LimitOrderClose',
      },
      chainId: 1,
      automatedMarketMaker: 'UNISWAP',
      condition: {
        type: 'TokenAmount',
        zeroAmountToken: 1,
      },
      nftId: '500513',
      ownerAddr: '0x4bD047CA72fa05F0B89ad08FE5Ba5ccdC07DFFBF',
      expiration: 1627776000,
    });
  });
});
