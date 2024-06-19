import {
  FeeAmount,
  TICK_SPACINGS,
  priceToClosestTick,
  tickToPrice,
} from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import hre, { ethers } from 'hardhat';
import { PublicClient, TestClient } from 'viem';

import {
  IERC20__factory,
  alignPriceToClosestUsableTick,
  getAMMInfo,
  parsePrice,
  priceToClosestTickSafe,
  tickToLimitOrderRange,
} from '../../../src';
import {
  generateLimitOrderCloseRequestPayload,
  getBasicPositionInfo,
  getCreatePositionTxForLimitOrder,
  getCurrencyAmount,
  getMintedPositionIdFromTxReceipt,
  getNativeCurrency,
  getPool,
  getPositionFromBasicInfo,
  getToken,
} from '../../../src/viem';
import { resetFork } from '../common';
import {
  UNIV3_AMM,
  WBTC_ADDRESS,
  WETH_ADDRESS,
  WHALE_ADDRESS,
  chainId,
  deadline,
  eoa,
  expect,
} from '../common';

describe('Viem - Limit order tests', function () {
  let WBTC: Token, WETH: Token;
  const poolFee = FeeAmount.MEDIUM;
  let testClient: TestClient;
  let publicClient: PublicClient;

  before(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient, 17188000n);
    WBTC = await getToken(WBTC_ADDRESS, chainId, publicClient);
    WETH = await getToken(WETH_ADDRESS, chainId, publicClient);
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
        UNIV3_AMM,
        publicClient,
      ),
    ).to.be.rejectedWith('Specified limit price not applicable');

    const pool = await getPool(
      WETH,
      WBTC,
      poolFee,
      chainId,
      UNIV3_AMM,
      publicClient,
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
      UNIV3_AMM,
      publicClient,
    );
    const npmAddress = getAMMInfo(
      chainId,
      UNIV3_AMM,
    )!.nonfungiblePositionManager;
    expect(tx).to.deep.equal({
      to: npmAddress,
      data: '0x883164560000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000000000000000000000000000000000000003f048000000000000000000000000000000000000000000000000000000000003f084000000000000000000000000000000000000000000000000000000003b9aca000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003b9aca0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004bd047ca72fa05f0b89ad08fe5ba5ccdc07dffbf00000000000000000000000000000000000000000000000000000000f3fd9d70',
      value: 0n,
      from: eoa,
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
      UNIV3_AMM,
      txReceipt,
      eoa,
    )!;
    const basicPositionInfo = await getBasicPositionInfo(
      chainId,
      UNIV3_AMM,
      positionId,
      publicClient,
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
      UNIV3_AMM,
      publicClient,
    );
    // The user actually provided 9.99999999 WBTC due to liquidity precision, i.e. 10 WBTC would have yielded the exact same liquidity amount of 134361875488133608.
    expect(position.amount0.quotient.toString()).to.equal('999999999');
    expect(position.amount1.quotient.toString()).to.equal('0');
    expect(
      generateLimitOrderCloseRequestPayload(
        eoa,
        chainId,
        AutomatedMarketMakerEnum.enum.UNISWAP_V3,
        positionId.toString(),
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
      amm: AutomatedMarketMakerEnum.enum.UNISWAP_V3,
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
        UNIV3_AMM,
        publicClient,
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
      UNIV3_AMM,
      publicClient,
    );
    const npmAddress = getAMMInfo(
      chainId,
      UNIV3_AMM,
    )!.nonfungiblePositionManager;
    expect(tx).to.deep.equal({
      to: npmAddress,
      data: '0x883164560000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000000000000000000000000000000000000003e508000000000000000000000000000000000000000000000000000000000003e54400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008ac7230489e7fe5900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008ac7230489e7fe590000000000000000000000004bd047ca72fa05f0b89ad08fe5ba5ccdc07dffbf00000000000000000000000000000000000000000000000000000000f3fd9d70',
      value: 0n,
      from: eoa,
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
      UNIV3_AMM,
      txReceipt,
      eoa,
    )!;
    const basicPositionInfo = await getBasicPositionInfo(
      chainId,
      UNIV3_AMM,
      positionId,
      publicClient,
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
      UNIV3_AMM,
      publicClient,
    );
    // The user actually provided 9.999999999999999576 WETH due to liquidity precision, i.e. 10 WETH would have yielded the exact same liquidity amount of 9551241229311572.
    expect(position.amount0.quotient.toString()).to.equal('0');
    expect(position.amount1.quotient.toString()).to.equal(
      '9999999999999999576',
    );
    expect(
      generateLimitOrderCloseRequestPayload(
        eoa,
        chainId,
        AutomatedMarketMakerEnum.enum.UNISWAP_V3,
        positionId.toString(),
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
      amm: AutomatedMarketMakerEnum.enum.UNISWAP_V3,
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
      UNIV3_AMM,
      publicClient,
    );
    expect(nativeEthTx).to.deep.equal({
      to: npmAddress,
      data: '0xac9650d800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000164883164560000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000000000000000000000000000000000000003e508000000000000000000000000000000000000000000000000000000000003e54400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008ac7230489e7fe5900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008ac7230489e7fe590000000000000000000000004bd047ca72fa05f0b89ad08fe5ba5ccdc07dffbf00000000000000000000000000000000000000000000000000000000f3fd9d7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000412210e8a00000000000000000000000000000000000000000000000000000000',
      value: 9999999999999999577n,
      from: eoa,
    });
    const nativeEthTxReceipt = await (
      await impersonatedEOA.sendTransaction(nativeEthTx)
    ).wait();
    const nativeEthPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      UNIV3_AMM,
      nativeEthTxReceipt,
      eoa,
    )!;
    expect(
      await getBasicPositionInfo(
        chainId,
        UNIV3_AMM,
        nativeEthPositionId,
        publicClient,
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
      generateLimitOrderCloseRequestPayload(
        eoa,
        chainId,
        AutomatedMarketMakerEnum.enum.UNISWAP_V3,
        nativeEthPositionId.toString(),
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
      amm: AutomatedMarketMakerEnum.enum.UNISWAP_V3,
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
