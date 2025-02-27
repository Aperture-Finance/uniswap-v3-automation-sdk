// yarn test:hardhat test/hardhat/hardhat.test.ts
import {
  FeeAmount,
  Pool,
  Position,
  TICK_SPACINGS,
  TickMath,
  nearestUsableTick,
  tickToPrice,
} from '@aperture_finance/uniswap-v3-sdk';
import '@nomicfoundation/hardhat-viem';
import { Fraction, Percent, Price, Token } from '@uniswap/sdk-core';
import { CurrencyAmount } from '@uniswap/smart-order-router';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { config as dotenvConfig } from 'dotenv';
import hre, { ethers } from 'hardhat';
import JSBI from 'jsbi';
import _ from 'lodash';
import {
  Address,
  PublicClient,
  TestClient,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  getContractAddress,
  parseAbiParameters,
  walletActions,
  zeroAddress,
} from 'viem';
import { mainnet } from 'viem/chains';

import {
  ActionTypeEnum,
  ApertureSupportedChainId,
  IERC20__factory,
  MAX_PRICE,
  MIN_PRICE,
  Q192,
  RecurringConditionTypeEnum,
  RecurringPercentageAction,
  RecurringPercentageCondition,
  RecurringPriceAction,
  RecurringPriceCondition,
  RecurringRatioAction,
  RecurringRatioCondition,
  UniV3Automan,
  UniV3Automan__factory,
  UniV3OptimalSwapRouter__factory,
  alignPriceToClosestUsableTick,
  convertRecurringCondition,
  fractionToBig,
  getAMMInfo,
  getTokenHistoricalPricesFromCoingecko,
  getTokenPriceFromCoingecko,
  getTokenPriceListFromCoingecko,
  getTokenPriceListFromCoingeckoWithAddresses,
  getTokenPriceListFromGeckoTerminalWithAddresses,
  humanPriceToClosestTick,
  normalizeTicks,
  priceToClosestUsableTick,
  priceToSqrtRatioX96,
  rangeWidthRatioToTicks,
  sqrtRatioToPrice,
  tickToBigPrice,
  tickToLimitOrderRange,
} from '../../src';
import {
  E_Solver,
  IncreaseLiquidityParams,
  PositionDetails,
  computeOperatorApprovalSlot,
  estimateRebalanceGas,
  estimateReinvestGas,
  generateAccessList,
  getERC20Overrides,
  getIncreaseLiquidityOptimalSwapInfo,
  getMintOptimalSwapInfo,
  getMintedPositionIdFromTxReceipt,
  getNPM,
  getPool,
  getPosition,
  getPublicClient,
  getRebalanceSwapInfo,
  getRebalanceTx,
  getSlipStreamPools,
  getSlipStreamStakePositions,
  getToken,
  simulateIncreaseLiquidityOptimal,
  simulateMintOptimal,
  simulateRemoveLiquidity,
} from '../../src/viem';
import {
  UNIV3_AMM as amm,
  getApiClient,
  hardhatForkProvider,
  resetFork,
} from './common';

dotenvConfig();

chai.use(chaiAsPromised);
const expect = chai.expect;
const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
const UNIV3_AMM = AutomatedMarketMakerEnum.enum.UNISWAP_V3;
// A whale address (Avax bridge) on Ethereum mainnet with a lot of ethers and token balances.
const WHALE_ADDRESS = '0x8EB8a3b98659Cce290402893d0123abb75E3ab28';
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
// Owner of position id 4 on Ethereum mainnet.
const eoa = '0x4bD047CA72fa05F0B89ad08FE5Ba5ccdC07DFFBF';
// A fixed epoch second value representing a moment in the year 2099.

describe('Estimate gas tests', function () {
  async function estimateRebalanceGasWithFrom(from: Address | undefined) {
    const blockNumber = 17975698n;
    const publicClient = getApiClient();
    const token0 = WBTC_ADDRESS;
    const token1 = WETH_ADDRESS;
    const fee = FeeAmount.MEDIUM;
    const amount0Desired = 100000000n;
    const amount1Desired = 1000000000000000000n;
    const pool = await getPool(
      token0,
      token1,
      fee,
      chainId,
      UNIV3_AMM,
      publicClient,
      blockNumber,
    );
    const mintParams = {
      token0: token0 as Address,
      token1: token1 as Address,
      fee,
      tickLower: nearestUsableTick(
        pool.tickCurrent - 10 * pool.tickSpacing,
        pool.tickSpacing,
      ),
      tickUpper: nearestUsableTick(
        pool.tickCurrent + 10 * pool.tickSpacing,
        pool.tickSpacing,
      ),
      amount0Desired,
      amount1Desired,
      amount0Min: BigInt(0),
      amount1Min: BigInt(0),
      recipient: eoa as Address,
      deadline: BigInt(Math.floor(Date.now() / 1000 + 60 * 30)),
    };
    const gas = await estimateRebalanceGas(
      chainId,
      UNIV3_AMM,
      publicClient,
      from,
      eoa,
      mintParams,
      4n,
      undefined,
      undefined,
      blockNumber,
    );
    return gas;
  }

  async function estimateReinvestGasWithFrom(from: Address | undefined) {
    const blockNumber = 17975698n;
    const publicClient = getApiClient();
    const amount0Desired = 100000n;
    const amount1Desired = 1000000000000000n;
    const gas = await estimateReinvestGas(
      chainId,
      UNIV3_AMM,
      publicClient,
      from,
      eoa,
      /* increaseLiquidityParams= */ {
        tokenId: 4n,
        amount0Desired: 0n, // Not used in reinvest.
        amount1Desired: 0n, // Not used in reinvest.
        amount0Min: amount0Desired,
        amount1Min: amount1Desired,
        deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      },
      /* feeBips= */ 0n,
      /* swapData= */ '0x',
      blockNumber,
    );
    return gas;
  }

  it('Test estimateRebalanceGas with owner', async function () {
    const gas = await estimateRebalanceGasWithFrom(eoa);
    expect(gas).to.equal(779808n);
  });

  it('Test estimateRebalanceGas with whale', async function () {
    const gas = await estimateRebalanceGasWithFrom(undefined);
    expect(gas).to.equal(782346n);
  });

  it('Test estimateReinvestGas with owner', async function () {
    const gas = await estimateReinvestGasWithFrom(eoa);
    expect(gas).to.equal(530653n);
  });

  it('Test estimateReinvestGas with whale', async function () {
    const gas = await estimateReinvestGasWithFrom(undefined);
    expect(gas).to.equal(530653n);
  });
});

describe('State overrides tests', function () {
  it('Test computeOperatorApprovalSlot', async function () {
    const testClient = await hre.viem.getTestClient();
    const publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient);
    await testClient.impersonateAccount({ address: WHALE_ADDRESS });
    const walletClient = testClient.extend(walletActions);
    // Deploy Automan.
    await walletClient.deployContract({
      abi: UniV3Automan__factory.abi,
      account: WHALE_ADDRESS,
      chain: mainnet,
      args: [
        getAMMInfo(chainId, UNIV3_AMM)!.nonfungiblePositionManager,
        /*owner=*/ WHALE_ADDRESS,
      ],
      bytecode: UniV3Automan__factory.bytecode,
    });
    const automanAddress = getContractAddress({
      from: WHALE_ADDRESS,
      nonce: BigInt(
        await publicClient.getTransactionCount({
          address: WHALE_ADDRESS,
        }),
      ),
    });
    const npm = getAMMInfo(chainId, UNIV3_AMM)!.nonfungiblePositionManager;
    const slot = computeOperatorApprovalSlot(eoa, automanAddress);
    expect(slot).to.equal(
      '0xaf12655eb680e77b7549c03375fd65c7a46c2854e913a071f6412c5b3d693f31',
    );
    expect(await publicClient.getStorageAt({ address: npm, slot })).to.equal(
      encodeAbiParameters(parseAbiParameters('bool'), [false]),
    );
    await testClient.impersonateAccount({ address: eoa });
    await getNPM(
      chainId,
      UNIV3_AMM,
      undefined,
      walletClient,
    ).write.setApprovalForAll([automanAddress, true], {
      account: eoa,
      chain: mainnet,
    });
    expect(await publicClient.getStorageAt({ address: npm, slot })).to.equal(
      encodeAbiParameters(parseAbiParameters('bool'), [true]),
    );
  });

  it('Test generateAccessList', async function () {
    const publicClient = getApiClient();
    const balanceOfData = encodeFunctionData({
      abi: IERC20__factory.abi,
      args: [eoa] as const,
      functionName: 'balanceOf',
    });
    const { accessList } = await generateAccessList(
      {
        from: zeroAddress,
        to: WETH_ADDRESS,
        data: balanceOfData,
      },
      publicClient,
    );
    expect(accessList[0].storageKeys[0]).to.equal(
      '0x5408245386fab212e3c3357882670a5f5af556f7edf543831e2995afd71f4348',
    );
  });

  it('Test getTokensOverrides', async function () {
    const publicClient = getApiClient();
    const amount0Desired = 1000000000000000000n;
    const amount1Desired = 100000000n;
    const { apertureAutoman } = getAMMInfo(chainId, UNIV3_AMM)!;
    const stateOverrides = {
      ...(await getERC20Overrides(
        WETH_ADDRESS,
        eoa,
        apertureAutoman,
        amount0Desired,
        publicClient,
      )),
      ...(await getERC20Overrides(
        WBTC_ADDRESS,
        eoa,
        apertureAutoman,
        amount1Desired,
        publicClient,
      )),
    };
    expect(stateOverrides).to.deep.equal({
      [WETH_ADDRESS]: {
        stateDiff: {
          '0x5408245386fab212e3c3357882670a5f5af556f7edf543831e2995afd71f4348':
            '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
          '0x746950bb1accd12acebc948663f14ea555a83343e6f94af3b6143301c7cadd30':
            '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
        },
      },
      [WBTC_ADDRESS]: {
        stateDiff: {
          '0x45746063dcd859f1d120c6388dbc814c95df435a74a62b64d984ad16fe434fff':
            '0x0000000000000000000000000000000000000000000000000000000005f5e100',
          '0x71f8d5def281e31983e4625bff84022ae0c3d962552b2a6a1798de60e3860703':
            '0x0000000000000000000000000000000000000000000000000000000005f5e100',
        },
      },
    });
  });

  it('Test simulateMintOptimal', async function () {
    const blockNumber = 17975698n;
    const publicClient = getApiClient();
    const token0 = WBTC_ADDRESS;
    const token1 = WETH_ADDRESS;
    const fee = FeeAmount.MEDIUM;
    const amount0Desired = 100000000n;
    const amount1Desired = 1000000000000000000n;
    const pool = await getPool(
      token0,
      token1,
      fee,
      chainId,
      UNIV3_AMM,
      publicClient,
      blockNumber,
    );
    const mintParams = {
      token0: token0 as Address,
      token1: token1 as Address,
      fee,
      tickLower: nearestUsableTick(
        pool.tickCurrent - 10 * pool.tickSpacing,
        pool.tickSpacing,
      ),
      tickUpper: nearestUsableTick(
        pool.tickCurrent + 10 * pool.tickSpacing,
        pool.tickSpacing,
      ),
      amount0Desired,
      amount1Desired,
      amount0Min: BigInt(0),
      amount1Min: BigInt(0),
      recipient: eoa as Address,
      deadline: BigInt(Math.floor(Date.now() / 1000 + 60 * 30)),
    };

    const [, liquidity, amount0, amount1] = await simulateMintOptimal(
      chainId,
      UNIV3_AMM,
      publicClient,
      eoa,
      mintParams,
      undefined,
      blockNumber,
    );
    expect(liquidity.toString()).to.equal('716894157038546');
    expect(amount0.toString()).to.equal('51320357');
    expect(amount1.toString()).to.equal('8736560293857784398');
  });

  it('Test simulateRemoveLiquidity', async function () {
    const blockNumber = 19142000n;
    const positionId = 655629n;
    const publicClient = getApiClient();
    const position = await PositionDetails.fromPositionId(
      chainId,
      amm,
      positionId,
      publicClient,
      blockNumber,
    );
    const [amount0, amount1] = await simulateRemoveLiquidity(
      chainId,
      amm,
      publicClient,
      position.owner,
      position.owner,
      BigInt(position.tokenId),
      undefined,
      undefined,
      0n,
      blockNumber,
    );
    expect(amount0.toString()).to.equal('908858032032850671014');
    expect(amount1.toString()).to.equal('3098315727923109118');
  });

  it('Test simulateIncreaseLiquidityOptimal', async function () {
    const blockNumber = 17975698n;
    const positionId = 4n;
    const publicClient = getApiClient();
    const amount0Desired = 100000000n;
    const amount1Desired = 1000000000000000000n;
    const position = await getPosition(
      chainId,
      UNIV3_AMM,
      positionId,
      publicClient,
      blockNumber,
    );
    const increaseLiquidityParams: IncreaseLiquidityParams = {
      tokenId: positionId,
      amount0Desired,
      amount1Desired,
      amount0Min: BigInt(0),
      amount1Min: BigInt(0),
      deadline: BigInt(Math.floor(Date.now() / 1000 + 60 * 30)),
    };

    const [, amount0, amount1] = await simulateIncreaseLiquidityOptimal(
      chainId,
      UNIV3_AMM,
      publicClient,
      eoa as Address,
      position,
      increaseLiquidityParams,
      undefined,
      blockNumber,
    );
    expect(amount0.toString()).to.equal('61259538');
    expect(amount1.toString()).to.equal('7156958298534991565');
  });
});

describe('CoinGecko tests', function () {
  let testClient: TestClient;
  let publicClient: PublicClient;

  beforeEach(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient);
  });

  it('Test CoinGecko single price', async function () {
    const token = await getToken(WETH_ADDRESS, chainId, publicClient);
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
          getToken(WBTC_ADDRESS, chainId, publicClient),
          getToken(WETH_ADDRESS, chainId, publicClient),
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
            publicClient,
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

  it('Test GeckoTerminal price list', async function () {
    {
      const prices = await getTokenPriceListFromGeckoTerminalWithAddresses(
        ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
        [WBTC_ADDRESS, WETH_ADDRESS],
      );
      for (const price of Object.values(prices)) {
        expect(Number(price)).to.be.greaterThan(0);
      }
    }
  });

  it('Test CoinGecko historical price list', async function () {
    const token = await getToken(WETH_ADDRESS, chainId, publicClient);
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
    const tick = priceToClosestUsableTick(maxPrice, fee);
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

  it('Tick to limit order range', function () {
    const tick = 18;
    Object.entries(TICK_SPACINGS).forEach(([fee, tickSpacing]) => {
      const { tickAvg, tickLower, tickUpper } = tickToLimitOrderRange(
        tick,
        Number(fee),
      );
      expect(Number.isInteger(tickAvg)).to.be.true;
      expect(Number.isInteger(tickLower)).to.be.true;
      expect(Number.isInteger(tickUpper)).to.be.true;
      expect(Math.round(tick - tickAvg)).to.be.lessThan(tickSpacing);
      expect(tickAvg).to.equal(Math.floor((tickLower + tickUpper) / 2));
      expect(tickUpper - tickLower).to.equal(tickSpacing);
    });
    const widthMultiplier = 2;
    const { tickAvg, tickLower, tickUpper } = tickToLimitOrderRange(
      tick,
      fee,
      widthMultiplier,
    );
    const tickSpacing = TICK_SPACINGS[fee];
    expect(Math.round(tick - tickAvg)).to.be.lessThan(tickSpacing);
    expect(tickAvg).to.equal(Math.floor((tickLower + tickUpper) / 2));
    expect(tickUpper - tickLower).to.equal(widthMultiplier * tickSpacing);
  });

  it('Tick to big price', function () {
    expect(tickToBigPrice(100).toNumber()).to.be.equal(
      new Big(1.0001).pow(100).toNumber(),
    );
  });

  it('Range width and ratio to ticks', function () {
    const tickCurrent = 200000;
    const price = tickToBigPrice(tickCurrent);
    const token0ValueProportion = new Big(0.3);
    const width = 1000;
    const { tickLower, tickUpper } = rangeWidthRatioToTicks(
      width,
      tickCurrent,
      token0ValueProportion,
    );
    expect(tickUpper - tickLower).to.equal(width);
    const priceLowerSqrt = tickToBigPrice(tickLower).sqrt();
    const priceUpperSqrt = tickToBigPrice(tickUpper).sqrt();
    // amount0 = liquidity * (1 / sqrt(price)) - (1 / sqrt(priceUpper))
    const amount0 = new Big(1)
      .div(price.sqrt())
      .minus(new Big(1).div(priceUpperSqrt));
    // amount1 = liquidity * (sqrt(price) - sqrt(priceLower))
    const amount1 = price.sqrt().minus(priceLowerSqrt);
    const value0 = amount0.times(price);
    const ratio = value0.div(value0.add(amount1)).toNumber();
    expect(ratio).to.be.closeTo(token0ValueProportion.toNumber(), 0.001);
  });

  it('Human price to closest tick', function () {
    const tick = humanPriceToClosestTick(token0, token1, maxPrice.toFixed());
    expect(tick).to.equal(TickMath.MAX_TICK - 1);
  });
});

describe('Slipstream pool tests', function () {
  it('getSlipStreamBasePools', async () => {
    const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;
    const client = getPublicClient(chainId);
    const blockNumber = 17514450n;
    const pools = await getSlipStreamPools(client, chainId, blockNumber);
    expect(Object.keys(pools).length).to.be.equal(107);
  });
  it('getSlipStreamOptimismPools', async () => {
    const chainId = ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID;
    const client = getPublicClient(chainId);
    const blockNumber = 126807301n;
    const pools = await getSlipStreamPools(client, chainId, blockNumber);
    expect(Object.keys(pools).length).to.be.equal(54);
  });
});

describe('Slipstream stake position tests', function () {
  it('getSlipStreamBaseStakePositions', async () => {
    const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;
    const client = getPublicClient(chainId);
    const blockNumber = 19669550n;
    const stakedPositions = await getSlipStreamStakePositions(
      '0xdC333239245ebBC6B656Ace7c08099AA415585d1',
      chainId,
      client,
      undefined,
      blockNumber,
    );
    expect(stakedPositions.length).to.be.equal(1);
  });
  it('getSlipStreamOptimismStakePositions', async () => {
    const chainId = ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID;
    const client = getPublicClient(chainId);
    const blockNumber = 126810142n;
    const stakedPositions = await getSlipStreamStakePositions(
      '0xdC333239245ebBC6B656Ace7c08099AA415585d1',
      chainId,
      client,
      undefined,
      blockNumber,
    );
    expect(stakedPositions.length).to.be.equal(1);
  });
});

describe('Recurring rebalance tests', function () {
  const arbitrumChainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
  const WETH_ARBITRUM = getAddress(
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  );
  const USDC_ARBITRUM = getAddress(
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
  );
  let pool: Pool;

  before(async function () {
    pool = await getPool(
      WETH_ARBITRUM,
      USDC_ARBITRUM,
      FeeAmount.LOW,
      arbitrumChainId,
      UNIV3_AMM,
      getPublicClient(arbitrumChainId),
    );
  });

  it('Test convertRecurringCondition', async function () {
    const price = fractionToBig(pool.token0Price);
    {
      const recurringCondition = {
        type: RecurringConditionTypeEnum.enum.RecurringPercentage,
        gteTickOffset: 100,
        lteTickOffset: -100,
      } as RecurringPercentageCondition;
      const priceCondition = convertRecurringCondition(
        recurringCondition,
        pool,
      );
      expect(new Big(priceCondition.gte!).gt(price)).to.be.true;
      expect(new Big(priceCondition.lte!).lt(price)).to.be.true;
    }
    {
      const recurringCondition = {
        type: RecurringConditionTypeEnum.enum.RecurringPrice,
        baseToken: 0,
        gtePriceOffset: '100',
        ltePriceOffset: '-100',
      } as RecurringPriceCondition;
      const priceCondition = convertRecurringCondition(
        recurringCondition,
        pool,
      );
      expect(new Big(priceCondition.gte!).gt(price)).to.be.true;
      expect(new Big(priceCondition.lte!).lt(price)).to.be.true;
    }
    {
      const recurringCondition = {
        type: RecurringConditionTypeEnum.enum.RecurringPrice,
        baseToken: 1,
        gtePriceOffset: '0.0001',
        ltePriceOffset: '-0.0001',
      } as RecurringPriceCondition;
      const priceCondition = convertRecurringCondition(
        recurringCondition,
        pool,
      );
      expect(new Big(priceCondition.gte!).gt(price)).to.be.true;
      expect(new Big(priceCondition.lte!).lt(price)).to.be.true;
    }
    {
      const recurringCondition = {
        type: RecurringConditionTypeEnum.enum.RecurringRatio,
        gteToken0ValueProportion: '0.6',
        lteToken0ValueProportion: '0.4',
      } as RecurringRatioCondition;
      const priceCondition = convertRecurringCondition(
        recurringCondition,
        pool,
        pool.tickCurrent - 100,
        pool.tickCurrent + 100,
      );
      expect(new Big(priceCondition.gte!).gt(price)).to.be.true;
      expect(new Big(priceCondition.lte!).lt(price)).to.be.true;
    }
  });

  it('Test normalizeTicks', async function () {
    {
      const action = {
        type: ActionTypeEnum.enum.RecurringPercentage,
        tickLowerOffset: -100,
        tickUpperOffset: 100,
      } as RecurringPercentageAction;
      const { tickLower } = normalizeTicks(action, pool);
      expect(tickLower).to.equal(
        nearestUsableTick(
          pool.tickCurrent + action.tickLowerOffset,
          pool.tickSpacing,
        ),
      );
    }
    {
      const action = {
        type: ActionTypeEnum.enum.RecurringPrice,
        baseToken: 0,
        priceLowerOffset: '-100',
        priceUpperOffset: '100',
      } as RecurringPriceAction;
      const { tickLower, tickUpper } = normalizeTicks(action, pool);
      expect(tickLower).to.be.lessThan(pool.tickCurrent);
      expect(tickUpper).to.be.greaterThan(pool.tickCurrent);
    }
    {
      const action = {
        type: ActionTypeEnum.enum.RecurringRatio,
        tickRangeWidth: 1000,
        token0ValueProportion: '0.5',
      } as RecurringRatioAction;
      const { tickLower, tickUpper } = normalizeTicks(action, pool);
      expect(tickLower).to.be.lessThan(pool.tickCurrent);
      expect(tickUpper).to.be.greaterThan(pool.tickCurrent);
      expect(tickUpper - tickLower).to.equal(action.tickRangeWidth);
    }
  });
});

describe('Viem - Automan transaction tests', function () {
  let testClient: TestClient;
  let publicClient: PublicClient;
  let automanContract: UniV3Automan;
  const automanAddress = getAMMInfo(chainId, amm)!.apertureAutoman;

  beforeEach(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient);

    // Without this, Hardhat throws an InvalidInputError saying that WHALE_ADDRESS is an unknown account.
    // Likely a Hardhat bug.
    // await hardhatForkProvider.getBalance(WHALE_ADDRESS);

    // Deploy Automan.
    automanContract = await new UniV3Automan__factory(
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      /*owner=*/ WHALE_ADDRESS,
    );
    await automanContract.deployed();
    await automanContract.setFeeConfig({
      feeCollector: WHALE_ADDRESS,
      // Set the max fee deduction to 50%.
      feeLimitPips: BigInt('500000000000000000'),
    });
    await automanContract.setControllers([WHALE_ADDRESS], [true]);
    const router = await new UniV3OptimalSwapRouter__factory(
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(getAMMInfo(chainId, amm)!.nonfungiblePositionManager);
    await router.deployed();
    await automanContract.setSwapRouters([router.address], [true]);

    // Set Automan address in CHAIN_ID_TO_INFO.
    getAMMInfo(chainId, amm)!.apertureAutoman =
      automanContract.address as `0x${string}`;
    getAMMInfo(chainId, amm)!.optimalSwapRouter =
      router.address as `0x${string}`;

    // Owner of position id 4 sets Automan as operator.
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);

    await getNPM(chainId, amm, undefined, walletClient).write.setApprovalForAll(
      [automanContract.address, true],
      {
        account: eoa,
        chain: walletClient.chain,
      },
    );
  });

  after(() => {
    // Reset Automan address in CHAIN_ID_TO_INFO.
    getAMMInfo(chainId, amm)!.apertureAutoman = automanAddress;
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

  it('getRebalanceTx', async function () {
    const positionId = 4n;

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
      /* newPositionTickLower= */ 240000,
      /* newPositionTickUpper= */ 300000,
      /* slippageTolerance= */ new Percent(1, 100),
      /* deadlineEpochSeconds= */ BigInt(Math.floor(Date.now() / 1000)),
      publicClient,
      swapData,
      liquidity,
      /* feeBips= */ 0n,
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

    const position = await PositionDetails.fromPositionId(
      chainId,
      amm,
      newPositionId,
      publicClient,
    );
    expect(
      _.pick(position, [
        'token0',
        'token1',
        'fee',
        'liquidity',
        'tickLower',
        'tickUpper',
      ]),
    ).to.deep.equal({
      token0: existingPosition.pool.token0,
      token1: existingPosition.pool.token1,
      fee: existingPosition.pool.fee,
      liquidity: '13324132541941',
      tickLower: 240000,
      tickUpper: 300000,
    });
  });

  it('Optimal mint no need swap', async function () {
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.MEDIUM,
      chainId,
      UNIV3_AMM,
      publicClient,
    );
    const tickLower = nearestUsableTick(
      pool.tickCurrent - 10 * pool.tickSpacing,
      pool.tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      pool.tickCurrent + 10 * pool.tickSpacing,
      pool.tickSpacing,
    );
    const hypotheticalPosition = new Position({
      pool,
      liquidity: '10000000000000000',
      tickLower,
      tickUpper,
    });

    await dealERC20(
      pool.token0.address as Address,
      pool.token1.address as Address,
      BigInt(hypotheticalPosition.amount0.quotient.toString()),
      BigInt(hypotheticalPosition.amount1.quotient.toString()),
      eoa,
      getAMMInfo(chainId, UNIV3_AMM)!.apertureAutoman,
    );

    const { swapRoute } = (
      await getMintOptimalSwapInfo(
        chainId,
        UNIV3_AMM,
        hypotheticalPosition.amount0,
        hypotheticalPosition.amount1,
        FeeAmount.MEDIUM,
        tickLower,
        tickUpper,
        eoa,
        0.5,
        publicClient,
        [E_Solver.SamePool],
      )
    )[0];

    expect(swapRoute?.length).to.equal(0);
  });

  it('Optimal mint with swap', async function () {
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.MEDIUM,
      chainId,
      UNIV3_AMM,
      publicClient,
    );
    const tickLower = nearestUsableTick(
      pool.tickCurrent - 10 * pool.tickSpacing,
      pool.tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      pool.tickCurrent + 10 * pool.tickSpacing,
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
      getAMMInfo(chainId, UNIV3_AMM)!.apertureAutoman,
    );

    const { swapPath, swapRoute } = (
      await getMintOptimalSwapInfo(
        chainId,
        UNIV3_AMM,
        token0Amount,
        token1Amount,
        FeeAmount.MEDIUM,
        tickLower,
        tickUpper,
        eoa,
        0.5,
        publicClient,
        [E_Solver.SamePool],
      )
    )[0];
    expect(swapRoute?.length).to.gt(0);
    expect(swapPath.tokenIn).to.equal(WBTC_ADDRESS);
    expect(swapPath.tokenOut).to.equal(WETH_ADDRESS);
  });

  it('Increase liquidity optimal no need swap', async function () {
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.MEDIUM,
      chainId,
      UNIV3_AMM,
      publicClient,
    );
    const positionId = 4;
    const [, , , , , tickLower, tickUpper] = await getNPM(
      chainId,
      UNIV3_AMM,
      publicClient,
    ).read.positions([BigInt(positionId)]);

    const hypotheticalPosition = new Position({
      pool,
      liquidity: '10000000000000000',
      tickLower,
      tickUpper,
    });

    await dealERC20(
      pool.token0.address as Address,
      pool.token1.address as Address,
      BigInt(hypotheticalPosition.amount0.quotient.toString()),
      BigInt(hypotheticalPosition.amount1.quotient.toString()),
      eoa,
      getAMMInfo(chainId, UNIV3_AMM)!.apertureAutoman,
    );

    const { swapRoute } = (
      await getIncreaseLiquidityOptimalSwapInfo(
        {
          tokenId: positionId,
          slippageTolerance: new Percent(5, 1000),
          deadline: Math.floor(Date.now() / 1000 + 60 * 30),
        },
        chainId,
        UNIV3_AMM,
        hypotheticalPosition.amount0,
        hypotheticalPosition.amount1,
        eoa as Address,
        publicClient,
        [E_Solver.SamePool],
        hypotheticalPosition,
      )
    )[0];

    expect(swapRoute?.length).to.equal(0);
  });
});
