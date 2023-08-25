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
import Big from 'big.js';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { config as dotenvConfig } from 'dotenv';
import { run } from 'hardhat';
import JSBI from 'jsbi';
import {
  Address,
  TestClient,
  createPublicClient,
  createTestClient,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  getContractAddress,
  http,
  parseAbiParameters,
  publicActions,
  walletActions,
} from 'viem';
import { arbitrum, hardhat, mainnet } from 'viem/chains';

import {
  ApertureSupportedChainId,
  ConditionTypeEnum,
  PriceConditionSchema,
} from '../../interfaces';
import { IERC20__factory, UniV3Automan__factory } from '../../typechain-types';
import {
  DOUBLE_TICK,
  MAX_PRICE,
  MIN_PRICE,
  PositionDetails,
  Q192,
  alignPriceToClosestUsableTick,
  computeOperatorApprovalSlot,
  fractionToBig,
  generateAccessList,
  generatePriceConditionFromTokenValueProportion,
  getAllPositions,
  getAutomanReinvestCalldata,
  getChainInfo,
  getFeeTierDistribution,
  getLiquidityArrayForPool,
  getNPM,
  getPool,
  getPosition,
  getPositionAtPrice,
  getPublicClient,
  getRawRelativePriceFromTokenValueProportion,
  getRebalancedPosition,
  getReinvestedPosition,
  getTickToLiquidityMapForPool,
  getToken,
  getTokenHistoricalPricesFromCoingecko,
  getTokenOverrides,
  getTokenPriceFromCoingecko,
  getTokenPriceListFromCoingecko,
  getTokenPriceListFromCoingeckoWithAddresses,
  getTokenSvg,
  getTokenValueProportionFromPriceRatio,
  isPositionInRange,
  priceToClosestUsableTick,
  priceToSqrtRatioX96,
  projectRebalancedPositionAtPrice,
  readTickToLiquidityMap,
  simulateMintOptimal,
  sqrtRatioToPrice,
  tickToLimitOrderRange,
} from '../../viem';

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

// Spin up a hardhat node.
run('node');

async function resetFork(testClient: TestClient) {
  await testClient.reset({
    blockNumber: 17188000n,
    jsonRpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
  });
}

describe('State overrides tests', function () {
  it('Test computeOperatorApprovalSlot', async function () {
    const testClient = createTestClient({
      chain: hardhat,
      mode: 'hardhat',
      transport: http(),
    }).extend(publicActions);
    await resetFork(testClient as unknown as TestClient);
    await testClient.impersonateAccount({ address: WHALE_ADDRESS });
    const walletClient = testClient.extend(walletActions);
    // Deploy Automan.
    await walletClient.deployContract({
      abi: UniV3Automan__factory.abi,
      account: WHALE_ADDRESS,
      chain: mainnet,
      args: [
        getChainInfo(chainId).uniswap_v3_nonfungible_position_manager,
        /*owner=*/ WHALE_ADDRESS,
      ],
      bytecode: UniV3Automan__factory.bytecode,
    });
    const automanAddress = getContractAddress({
      from: WHALE_ADDRESS,
      nonce: BigInt(
        await testClient.getTransactionCount({
          address: WHALE_ADDRESS,
        }),
      ),
    });
    const npm = getChainInfo(chainId).uniswap_v3_nonfungible_position_manager;
    const slot = computeOperatorApprovalSlot(eoa, automanAddress);
    expect(slot).to.equal(
      '0x51156c1de32f203e86d75e4e57e423f7f92397e1c16780f885a8a97775f56b6a',
    );
    expect(await testClient.getStorageAt({ address: npm, slot })).to.equal(
      encodeAbiParameters(parseAbiParameters('bool'), [false]),
    );
    await testClient.impersonateAccount({ address: eoa });
    await getNPM(chainId, undefined, walletClient).write.setApprovalForAll(
      [automanAddress, true],
      {
        account: eoa,
        chain: mainnet,
      },
    );
    expect(await testClient.getStorageAt({ address: npm, slot })).to.equal(
      encodeAbiParameters(parseAbiParameters('bool'), [true]),
    );
  });

  it('Test generateAccessList', async function () {
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(
        `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      ),
    });
    const balanceOfData = encodeFunctionData({
      abi: IERC20__factory.abi,
      args: [eoa] as const,
      functionName: 'balanceOf',
    });
    const res = await generateAccessList(
      {
        from: eoa,
        to: WETH_ADDRESS,
        data: balanceOfData,
      },
      publicClient,
    );
    expect(res[0].storageKeys[0]).to.equal(
      '0x5408245386fab212e3c3357882670a5f5af556f7edf543831e2995afd71f4348',
    );
  });

  it('Test getTokensOverrides', async function () {
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(
        `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      ),
    });
    const amount0Desired = 1000000000000000000n;
    const amount1Desired = 100000000n;
    const stateOverrides = await getTokenOverrides(
      chainId,
      publicClient,
      eoa,
      WETH_ADDRESS,
      WBTC_ADDRESS,
      amount0Desired,
      amount1Desired,
    );
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
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(
        `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      ),
    });
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
      undefined,
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
});

describe('Position util tests', function () {
  let inRangePosition: Position;
  const testClient = createTestClient({
    chain: hardhat,
    mode: 'hardhat',
    transport: http(),
  }).extend(publicActions);

  beforeEach(async function () {
    await resetFork(testClient as unknown as TestClient);
    inRangePosition = await getPosition(chainId, 4n, testClient);
  });

  // TODO: add permit tests.
  // it('Position approval', async function () {});

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

  it('Test getReinvestedPosition', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const { aperture_uniswap_v3_automan } = getChainInfo(chainId);
    const jsonRpcUrl = `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;
    const publicClient = createPublicClient({
      chain: arbitrum,
      transport: http(jsonRpcUrl),
    });
    const positionId = 761879n;
    const blockNumber = 119626480n;
    const npm = getNPM(chainId, publicClient);
    const opts = {
      blockNumber,
    };
    const owner = await npm.read.ownerOf([positionId], opts);
    expect(
      await npm.read.isApprovedForAll(
        [owner, aperture_uniswap_v3_automan],
        opts,
      ),
    ).to.be.false;
    const [liquidity] = await getReinvestedPosition(
      chainId,
      positionId,
      publicClient,
      blockNumber,
    );
    // testClient doesn't change chainId after reset
    await testClient.reset({
      blockNumber,
      jsonRpcUrl,
    });
    await testClient.impersonateAccount({ address: owner });
    const walletClient = testClient.extend(walletActions);
    await getNPM(chainId, undefined, walletClient).write.setApprovalForAll(
      [aperture_uniswap_v3_automan, true],
      {
        account: owner,
        chain: mainnet, // has to be mainnet due to viem's quirkiness
      },
    );
    const { liquidity: liquidityBefore } = await getPosition(
      chainId,
      positionId,
      testClient,
    );
    const data = getAutomanReinvestCalldata(
      positionId,
      BigInt(Math.round(new Date().getTime() / 1000 + 60 * 10)), // 10 minutes from now.
    );
    await walletClient.sendTransaction({
      account: owner,
      chain: mainnet,
      to: aperture_uniswap_v3_automan,
      data,
    });
    const { liquidity: liquidityAfter } = await getPosition(
      chainId,
      positionId,
      testClient,
    );
    expect(JSBI.subtract(liquidityAfter, liquidityBefore).toString()).to.equal(
      liquidity.toString(),
    );
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
});

describe('Pool subgraph query tests', function () {
  it('Fee tier distribution', async function () {
    const [distribution, distributionOppositeTokenOrder] = await Promise.all([
      getFeeTierDistribution(chainId, WBTC_ADDRESS, WETH_ADDRESS),
      getFeeTierDistribution(chainId, WETH_ADDRESS, WBTC_ADDRESS),
    ]);
    expect(distribution).to.deep.equal(distributionOppositeTokenOrder);
    expect(
      Object.values(distribution).reduce(
        (partialSum, num) => partialSum + num,
        0,
      ),
    ).to.be.approximately(/*expected=*/ 1, /*delta=*/ 1e-9);
  });

  async function testLiquidityDistribution(
    chainId: ApertureSupportedChainId,
    pool: Pool,
  ) {
    const tickCurrentAligned =
      Math.floor(pool.tickCurrent / pool.tickSpacing) * pool.tickSpacing;
    const tickLower = pool.tickCurrent - DOUBLE_TICK;
    const tickUpper = pool.tickCurrent + DOUBLE_TICK;
    const [liquidityArr, tickToLiquidityMap] = await Promise.all([
      getLiquidityArrayForPool(chainId, pool, tickLower, tickUpper),
      getTickToLiquidityMapForPool(chainId, pool, tickLower, tickUpper),
    ]);
    expect(liquidityArr.length).to.be.greaterThan(0);
    expect(tickToLiquidityMap.size).to.be.greaterThan(0);
    for (const liquidity of tickToLiquidityMap.values()) {
      expect(JSBI.greaterThanOrEqual(liquidity, JSBI.BigInt(0))).to.equal(true);
    }
    expect(
      JSBI.equal(
        pool.liquidity,
        readTickToLiquidityMap(tickToLiquidityMap, tickCurrentAligned)!,
      ),
    ).to.equal(true);
    const filteredLiquidityArr = liquidityArr.filter(
      ({ tick }) => tick <= tickCurrentAligned,
    );
    expect(
      filteredLiquidityArr[filteredLiquidityArr.length - 1].liquidityActive,
    ).to.equal(pool.liquidity.toString());
  }

  it('Tick liquidity distribution - Ethereum mainnet', async function () {
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.LOW,
      chainId,
      getPublicClient(chainId),
    );
    await testLiquidityDistribution(chainId, pool);
  });

  it('Tick liquidity distribution - Arbitrum mainnet', async function () {
    const arbitrumChainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
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
      getPublicClient(arbitrumChainId),
    );
    await testLiquidityDistribution(arbitrumChainId, pool);
  });
});
