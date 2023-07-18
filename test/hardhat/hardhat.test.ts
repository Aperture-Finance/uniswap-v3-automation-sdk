import { Fraction, Price, Token } from '@uniswap/sdk-core';
import {
  FeeAmount,
  Pool,
  Position,
  TICK_SPACINGS,
  TickMath,
  nearestUsableTick,
  tickToPrice,
} from '@uniswap/v3-sdk';
import axios from 'axios';
import Big from 'big.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { config as dotenvConfig } from 'dotenv';
import { run } from 'hardhat';
import JSBI from 'jsbi';
import {
  TestClient,
  createTestClient,
  getAddress,
  http,
  publicActions,
} from 'viem';
import { hardhat } from 'viem/chains';

import { getChainInfo } from '../../chain';
import { getToken } from '../../currency';
import {
  ApertureSupportedChainId,
  ConditionTypeEnum,
  PriceConditionSchema,
} from '../../interfaces';
import { generatePriceConditionFromTokenValueProportion } from '../../payload';
import {
  getFeeTierDistribution,
  getLiquidityArrayForPool,
  getPool,
  getTickToLiquidityMapForPool,
} from '../../pool';
import {
  PositionDetails,
  getAllPositions,
  getNPM,
  getPosition,
  getPositionAtPrice,
  getRebalancedPosition,
  getTokenSvg,
  isPositionInRange,
  projectRebalancedPositionAtPrice,
} from '../../position';
import {
  Q192,
  fractionToBig,
  getRawRelativePriceFromTokenValueProportion,
  getTokenHistoricalPricesFromCoingecko,
  getTokenPriceFromCoingecko,
  getTokenPriceListFromCoingecko,
  getTokenPriceListFromCoingeckoWithAddresses,
  getTokenValueProportionFromPriceRatio,
  priceToSqrtRatioX96,
} from '../../price';
import { getPublicClient } from '../../public_client';
import {
  MAX_PRICE,
  MIN_PRICE,
  alignPriceToClosestUsableTick,
  priceToClosestUsableTick,
  readTickToLiquidityMap,
  sqrtRatioToPrice,
} from '../../tick';

dotenvConfig();

chai.use(chaiAsPromised);
const expect = chai.expect;
const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
// A whale address (Avax bridge) on Ethereum mainnet with a lot of ethers and token balances.
const WHALE_ADDRESS = '0x8EB8a3b98659Cce290402893d0123abb75E3ab28';
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
// Owner of position id 4 on Ethereum mainnet.
const eoa = '0x4bD047CA72fa05F0B89ad08FE5Ba5ccdC07DFFBF';
// A fixed epoch second value representing a moment in the year 2099.
const deadline = '4093484400';

// Test wallet so we can test signing permit messages.
// Public key: 0x035dcbb4b39244cef94d3263074f358a1d789e6b99f278d5911f9694da54312636
// Address: 0x1ccaCD01fD2d973e134EC6d4F916b90A45634eCe
const TEST_WALLET_PRIVATE_KEY =
  '0x077646fb889571f9ce30e420c155812277271d4d914c799eef764f5709cafd5b';

// Spin up a hardhat node.
run('node');

async function resetFork(testClient: TestClient) {
  await testClient.reset({
    blockNumber: 17188000n,
    jsonRpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
  });
}

describe('Util tests', function () {
  let inRangePosition: Position;
  const testClient = createTestClient({
    chain: hardhat,
    mode: 'hardhat',
    transport: http(),
  }).extend(publicActions);

  before(async function () {
    await resetFork(testClient as unknown as TestClient);
    inRangePosition = await getPosition(chainId, 4n, testClient);
  });

  it('Position in-range', async function () {
    const outOfRangePosition = await getPosition(chainId, 7n, testClient);
    expect(isPositionInRange(inRangePosition)).to.equal(true);
    expect(isPositionInRange(outOfRangePosition)).to.equal(false);
  });

  it('Token Svg', async function () {
    const url = await getTokenSvg(chainId, 4n, testClient);
    expect(url.toString().slice(0, 60)).to.equal(
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjkwIiBoZWlnaHQ9Ij',
    );
  });

  it('Token value proportion to price conversion', async function () {
    const price = getRawRelativePriceFromTokenValueProportion(
      inRangePosition.tickLower,
      inRangePosition.tickUpper,
      new Big('0.3'),
    );
    expect(price.toString()).to.equal(
      '226996287752.678057810335753063814267017558211732849518876855922215569664',
    );
    expect(
      getRawRelativePriceFromTokenValueProportion(
        inRangePosition.tickLower,
        inRangePosition.tickUpper,
        new Big('0'),
      ).toString(),
    ).to.equal(
      new Big(TickMath.getSqrtRatioAtTick(inRangePosition.tickUpper).toString())
        .pow(2)
        .div(Q192)
        .toString(),
    );
    expect(
      getRawRelativePriceFromTokenValueProportion(
        inRangePosition.tickLower,
        inRangePosition.tickUpper,
        new Big('1'),
      ).toString(),
    ).to.equal(
      new Big(TickMath.getSqrtRatioAtTick(inRangePosition.tickLower).toString())
        .pow(2)
        .div(Q192)
        .toString(),
    );

    // Verify that the calculated price indeed corresponds to ~30% of the position value in token0.
    const token0ValueProportion = getTokenValueProportionFromPriceRatio(
      inRangePosition.tickLower,
      inRangePosition.tickUpper,
      price,
    );
    expect(token0ValueProportion.toFixed(30)).to.equal(
      '0.299999999999999999999998780740',
    );

    // Verify that price condition is generated correctly.
    const condition = generatePriceConditionFromTokenValueProportion(
      inRangePosition.tickLower,
      inRangePosition.tickUpper,
      false,
      new Big('0.3'),
      /*durationSec=*/ 7200,
    );
    expect(PriceConditionSchema.safeParse(condition).success).to.equal(true);
    expect(condition).to.deep.equal({
      type: ConditionTypeEnum.enum.Price,
      lte: undefined,
      gte: '226996287752.678057810335753063814267017558211732849518876855922215569664',
      durationSec: 7200,
    });
    expect(
      generatePriceConditionFromTokenValueProportion(
        inRangePosition.tickLower,
        inRangePosition.tickUpper,
        true,
        new Big('0.95'),
        /*durationSec=*/ undefined,
      ),
    ).to.deep.equal({
      type: ConditionTypeEnum.enum.Price,
      lte: '104792862935.904580651554157750042230410340267140482472644533377909257225',
      gte: undefined,
      durationSec: undefined,
    });
    const ratio = new Big('0.299999999999999999999998780740');
    const pp = getRawRelativePriceFromTokenValueProportion(
      -887220,
      27720,
      ratio,
    );
    const DP = ratio.toString().length - 3;
    Big.DP = DP;
    const ratio2 = getTokenValueProportionFromPriceRatio(
      -887220,
      27720,
      new Big(pp.toString()),
    );
    expect(ratio.toFixed(DP)).to.equal(ratio2.toFixed(DP));
  });

  it('Test getRebalancedPosition', async function () {
    // rebalance to an out of range position
    const newTickLower = inRangePosition.tickUpper;
    const newTickUpper = newTickLower + 10 * TICK_SPACINGS[FeeAmount.MEDIUM];
    const newPosition = getRebalancedPosition(
      inRangePosition,
      newTickLower,
      newTickUpper,
    );
    expect(JSBI.toNumber(newPosition.amount1.quotient)).to.equal(0);
    const revertedPosition = getRebalancedPosition(
      newPosition,
      inRangePosition.tickLower,
      inRangePosition.tickUpper,
    );
    const amount0 = JSBI.toNumber(inRangePosition.amount0.quotient);
    expect(
      JSBI.toNumber(revertedPosition.amount0.quotient),
    ).to.be.approximately(amount0, amount0 / 1e6);
    const amount1 = JSBI.toNumber(inRangePosition.amount1.quotient);
    expect(
      JSBI.toNumber(revertedPosition.amount1.quotient),
    ).to.be.approximately(amount1, amount1 / 1e6);
    const liquidity = JSBI.toNumber(inRangePosition.liquidity);
    expect(JSBI.toNumber(revertedPosition.liquidity)).to.be.approximately(
      liquidity,
      liquidity / 1e6,
    );
  });

  it('Test getPositionAtPrice', async function () {
    // corresponds to tick -870686
    const smallPrice = new Big('1.5434597458370203830544e-38');
    const position = new Position({
      pool: new Pool(
        inRangePosition.pool.token0,
        inRangePosition.pool.token1,
        3000,
        '797207963837958202618833735859',
        '4923530363713842',
        46177,
      ),
      liquidity: 68488980,
      tickLower: -887220,
      tickUpper: 52980,
    });
    const position1 = getPositionAtPrice(position, smallPrice);
    expect(JSBI.toNumber(position1.amount0.quotient)).to.greaterThan(0);
    expect(JSBI.toNumber(position1.amount1.quotient)).to.equal(0);
    const position2 = getPositionAtPrice(
      position,
      fractionToBig(
        tickToPrice(
          inRangePosition.pool.token0,
          inRangePosition.pool.token1,
          inRangePosition.tickUpper,
        ),
      ),
    );
    expect(JSBI.toNumber(position2.amount0.quotient)).to.equal(0);
    expect(JSBI.toNumber(position2.amount1.quotient)).to.greaterThan(0);
    const rebalancedPosition = getRebalancedPosition(position1, 46080, 62160);
    expect(JSBI.toNumber(rebalancedPosition.amount0.quotient)).to.greaterThan(
      0,
    );
    expect(JSBI.toNumber(rebalancedPosition.amount1.quotient)).to.equal(0);
  });

  it('Test projectRebalancedPositionAtPrice', async function () {
    const priceUpper = tickToPrice(
      inRangePosition.pool.token0,
      inRangePosition.pool.token1,
      inRangePosition.tickUpper,
    );
    // rebalance to an out of range position
    const newTickLower = inRangePosition.tickUpper;
    const newTickUpper = newTickLower + 10 * TICK_SPACINGS[FeeAmount.MEDIUM];
    const positionRebalancedAtCurrentPrice = getRebalancedPosition(
      inRangePosition,
      newTickLower,
      newTickUpper,
    );
    const positionRebalancedAtTickUpper = projectRebalancedPositionAtPrice(
      inRangePosition,
      fractionToBig(priceUpper),
      newTickLower,
      newTickUpper,
    );
    expect(
      JSBI.toNumber(positionRebalancedAtTickUpper.amount1.quotient),
    ).to.equal(0);
    // if rebalancing at the upper tick, `token0` are bought back at a higher price, hence `amount0` will be lower
    expect(
      JSBI.toNumber(
        positionRebalancedAtCurrentPrice.amount0.subtract(
          positionRebalancedAtTickUpper.amount0,
        ).quotient,
      ),
    ).to.greaterThan(0);
  });

  it('Test viewCollectableTokenAmounts', async function () {
    const positionDetails = await PositionDetails.fromPositionId(
      chainId,
      4n,
      testClient,
    );
    const colletableTokenAmounts =
      await positionDetails.getCollectableTokenAmounts(testClient);
    expect(colletableTokenAmounts).to.deep.equal({
      token0Amount: positionDetails.tokensOwed0,
      token1Amount: positionDetails.tokensOwed1,
    });
  });

  it('Test get position details', async function () {
    const { position } = await PositionDetails.fromPositionId(
      chainId,
      4n,
      testClient,
    );
    expect(position).to.deep.equal(await getPosition(chainId, 4n, testClient));
  });

  it('Test getAllPositions', async function () {
    const publicClient = getPublicClient(5);
    // an address with 90+ positions
    const address = '0xD68C7F0b57476D5C9e5686039FDFa03f51033a4f';
    const positionDetails = await getAllPositions(
      address,
      chainId,
      publicClient,
    );
    const npm = getNPM(chainId, publicClient);
    const numPositions = await npm.read.balanceOf([address]);
    const positionIds = await Promise.all(
      [...Array(Number(numPositions)).keys()].map((index) =>
        npm.read.tokenOfOwnerByIndex([address, BigInt(index)]),
      ),
    );
    const positionInfos = new Map(
      await Promise.all(
        positionIds.map(async (positionId) => {
          return [
            positionId.toString(),
            await getPosition(chainId, positionId, publicClient),
          ] as const;
        }),
      ),
    );
    expect(positionDetails.size).to.equal(positionInfos.size);
    for (const [tokenId, pos] of positionDetails.entries()) {
      const position = positionInfos.get(tokenId);
      expect(position).to.not.be.undefined;
      expect(position?.pool.token0).to.deep.equal(pos.pool.token0);
      expect(position?.pool.token1).to.deep.equal(pos.pool.token1);
      expect(position?.pool.fee).to.equal(pos.pool.fee);
      expect(position?.liquidity.toString()).to.equal(pos.liquidity.toString());
      expect(position?.tickLower).to.equal(pos.tickLower);
      expect(position?.tickUpper).to.equal(pos.tickUpper);
    }
  });
});

describe('CoinGecko tests', function () {
  const testClient = createTestClient({
    chain: hardhat,
    mode: 'hardhat',
    transport: http(),
  }).extend(publicActions);

  before(async function () {
    await resetFork(testClient as unknown as TestClient);
  });

  it('Test CoinGecko single price', async function () {
    const token = await getToken(WETH_ADDRESS, chainId, testClient);
    const usdPrice = await getTokenPriceFromCoingecko(
      token,
      'usd',
      process.env.COINGECKO_API_KEY,
    );
    expect(usdPrice).to.be.greaterThan(0);
    const ethPrice = await getTokenPriceFromCoingecko(
      token,
      'eth',
      process.env.COINGECKO_API_KEY,
    );
    expect(ethPrice).to.be.closeTo(1, 0.01);
  });

  it('Test CoinGecko price list', async function () {
    {
      const prices = await getTokenPriceListFromCoingecko(
        await Promise.all([
          getToken(WBTC_ADDRESS, chainId, testClient),
          getToken(WETH_ADDRESS, chainId, testClient),
        ]),
        'eth',
        process.env.COINGECKO_API_KEY,
      );
      for (const price of Object.values(prices)) {
        expect(price).to.be.greaterThan(0);
      }
    }

    {
      const prices = await getTokenPriceListFromCoingeckoWithAddresses(
        ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
        [WBTC_ADDRESS, WETH_ADDRESS],
        'usd',
        process.env.COINGECKO_API_KEY,
      );
      for (const price of Object.values(prices)) {
        expect(price).to.be.greaterThan(0);
      }
    }

    expect(
      getTokenPriceListFromCoingecko(
        await Promise.all([
          getToken(
            WBTC_ADDRESS,
            ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
            testClient,
          ),
          new Token(
            ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID,
            '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
            6,
          ),
        ]),
        'usd',
      ),
    ).to.be.rejectedWith('All tokens must have the same chain id');
  });

  it('Test CoinGecko historical price list', async function () {
    const token = await getToken(WETH_ADDRESS, chainId, testClient);
    const prices = await getTokenHistoricalPricesFromCoingecko(
      token,
      30,
      'usd',
      process.env.COINGECKO_API_KEY,
    );
    expect(prices.length).to.be.greaterThan(0);
  });
});

describe('Price to tick conversion', function () {
  const token0 = new Token(1, WBTC_ADDRESS, 18);
  const token1 = new Token(1, WETH_ADDRESS, 18);
  const fee = FeeAmount.MEDIUM;
  const zeroPrice = new Price(token0, token1, '1', '0');
  const maxPrice = new Price(
    token0,
    token1,
    MAX_PRICE.denominator,
    MAX_PRICE.numerator,
  );

  it('A zero price should return MIN_TICK', function () {
    expect(priceToClosestUsableTick(zeroPrice, fee)).to.equal(
      nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[fee]),
    );
  });

  it('The tick is invariant to the order of base/quote tokens', function () {
    expect(priceToClosestUsableTick(zeroPrice.invert(), fee)).to.equal(
      priceToClosestUsableTick(zeroPrice, fee),
    );
    expect(priceToClosestUsableTick(maxPrice.invert(), fee)).to.equal(
      priceToClosestUsableTick(maxPrice, fee),
    );
  });

  it('If token1 is the baseCurrency, then a price of 0 should return MAX_TICK', function () {
    expect(
      priceToClosestUsableTick(new Price(token1, token0, '1', '0'), fee),
    ).to.equal(nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[fee]));
  });

  it('MIN_PRICE should return MIN_TICK', function () {
    expect(
      priceToClosestUsableTick(
        new Price(token0, token1, MIN_PRICE.denominator, MIN_PRICE.numerator),
        fee,
      ),
    ).to.equal(nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[fee]));
  });

  it('Prices greater than MAX_PRICE should return MAX_TICK', function () {
    expect(
      priceToClosestUsableTick(
        new Price(
          token0,
          token1,
          MAX_PRICE.denominator,
          JSBI.add(MAX_PRICE.numerator, JSBI.BigInt(1)),
        ),
        fee,
      ),
    ).to.equal(nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[fee]));
  });

  it('MAX_PRICE should return MAX_TICK', function () {
    expect(priceToClosestUsableTick(maxPrice, fee)).to.equal(
      nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[fee]),
    );
  });

  it('Sqrt ratio to price', function () {
    const price = alignPriceToClosestUsableTick(maxPrice, fee);
    const tick = priceToClosestUsableTick(price, fee);
    expect(
      sqrtRatioToPrice(TickMath.getSqrtRatioAtTick(tick), token0, token1),
    ).to.deep.equal(price);

    const minPrice = tickToPrice(token0, token1, TickMath.MIN_TICK);
    expect(
      sqrtRatioToPrice(TickMath.MIN_SQRT_RATIO, token0, token1),
    ).to.deep.equal(minPrice);
  });

  it('Price to sqrt ratio', function () {
    const tick = priceToClosestUsableTick(
      alignPriceToClosestUsableTick(maxPrice, fee),
      fee,
    );
    const sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
    const price = sqrtRatioToPrice(sqrtRatioX96, token0, token1);
    expect(priceToSqrtRatioX96(fractionToBig(price)).toString()).to.equal(
      sqrtRatioX96.toString(),
    );
  });

  it('Price to Big', function () {
    const minPrice = tickToPrice(token0, token1, TickMath.MIN_TICK);
    const bigPrice = fractionToBig(minPrice);
    expect(
      minPrice.equalTo(
        new Fraction(bigPrice.mul(Q192).toFixed(0), Q192.toFixed(0)),
      ),
    ).to.be.true;
  });
});

describe('Pool subgraph query tests', function () {
  it('Fee tier distribution', async function () {
    const [distribution, distributionOppositeTokenOrder] = await Promise.all([
      getFeeTierDistribution(chainId, WBTC_ADDRESS, WETH_ADDRESS),
      getFeeTierDistribution(chainId, WETH_ADDRESS, WBTC_ADDRESS),
    ]);
    expect(distribution).deep.equal(distributionOppositeTokenOrder);
    expect(
      Object.values(distribution).reduce(
        (partialSum, num) => partialSum + num,
        0,
      ),
    ).to.be.approximately(/*expected=*/ 1, /*delta=*/ 1e-9);
  });

  it('Tick liquidity distribution - Ethereum mainnet', async function () {
    const publicClient = getPublicClient(chainId);
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.LOW,
      chainId,
      publicClient,
    );
    const tickToLiquidityMap = await getTickToLiquidityMapForPool(
      chainId,
      pool,
    );
    expect(tickToLiquidityMap.size).to.be.greaterThan(0);
    for (const liquidity of tickToLiquidityMap.values()) {
      expect(JSBI.greaterThanOrEqual(liquidity, JSBI.BigInt(0))).to.equal(true);
    }

    // Fetch current in-range liquidity from subgraph.
    const chainInfo = getChainInfo(chainId);
    const poolResponse = (
      await axios.post(chainInfo.uniswap_subgraph_url!, {
        operationName: 'PoolLiquidity',
        variables: {},
        query: `
          query PoolLiquidity {
            pool(id: "0x4585fe77225b41b697c938b018e2ac67ac5a20c0") {
              liquidity
              tick
            }
          }`,
      })
    ).data.data.pool;
    const inRangeLiquidity = JSBI.BigInt(poolResponse.liquidity);
    const tickSpacing = TICK_SPACINGS[FeeAmount.LOW];
    const tickCurrentAligned =
      Math.floor(Number(poolResponse.tick) / tickSpacing) * tickSpacing;
    expect(
      JSBI.equal(
        inRangeLiquidity,
        readTickToLiquidityMap(tickToLiquidityMap, tickCurrentAligned)!,
      ),
    ).to.equal(true);
    const liquidityArr = await getLiquidityArrayForPool(chainId, pool);
    expect(
      liquidityArr.some((element) =>
        JSBI.equal(element.liquidityActive, inRangeLiquidity),
      ),
    ).to.be.true;
  });

  it('Tick liquidity distribution - Arbitrum mainnet', async function () {
    const arbitrumChainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const publicClient = getPublicClient(arbitrumChainId);
    const WETH_ARBITRUM = getAddress(
      '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    );
    const USDC_ARBITRUM = getAddress(
      '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    );
    const pool = await getPool(
      WETH_ARBITRUM,
      USDC_ARBITRUM,
      FeeAmount.LOW,
      arbitrumChainId,
      publicClient,
    );
    const tickToLiquidityMap = await getTickToLiquidityMapForPool(
      arbitrumChainId,
      pool,
    );
    expect(tickToLiquidityMap.size).to.be.greaterThan(0);
    for (const liquidity of tickToLiquidityMap.values()) {
      expect(JSBI.greaterThanOrEqual(liquidity, JSBI.BigInt(0))).to.equal(true);
    }

    // Fetch current in-range liquidity from subgraph.
    const chainInfo = getChainInfo(arbitrumChainId);
    const poolResponse = (
      await axios.post(chainInfo.uniswap_subgraph_url!, {
        operationName: 'PoolLiquidity',
        variables: {},
        query: `
          query PoolLiquidity {
            pool(id: "0xc31e54c7a869b9fcbecc14363cf510d1c41fa443") {
              liquidity
              tick
            }
          }`,
      })
    ).data.data.pool;
    const inRangeLiquidity = JSBI.BigInt(poolResponse.liquidity);
    const tickSpacing = TICK_SPACINGS[FeeAmount.LOW];
    const tickCurrentAligned =
      Math.floor(Number(poolResponse.tick) / tickSpacing) * tickSpacing;
    expect(
      JSBI.equal(
        inRangeLiquidity,
        readTickToLiquidityMap(tickToLiquidityMap, tickCurrentAligned)!,
      ),
    ).to.equal(true);
  });
});
