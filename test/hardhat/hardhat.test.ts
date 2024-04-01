import { providers } from '@0xsequence/multicall';
import '@nomicfoundation/hardhat-viem';
import { Fraction, Percent, Price, Token } from '@uniswap/sdk-core';
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
import { defaultAbiCoder } from 'ethers/lib/utils';
import hre from 'hardhat';
import JSBI from 'jsbi';
import {
  Address,
  PublicClient,
  TestClient,
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  getContractAddress,
  http,
  parseAbiParameters,
  walletActions,
  zeroAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum, mainnet } from 'viem/chains';

import {
  ActionTypeEnum,
  ApertureSupportedChainId,
  AutomatedMarketMakerEnum,
  ConditionTypeEnum,
  DOUBLE_TICK,
  IERC20__factory,
  MAX_PRICE,
  MIN_PRICE,
  PriceConditionSchema,
  Q192,
  RecurringConditionTypeEnum,
  RecurringPercentageAction,
  RecurringPercentageCondition,
  RecurringPriceAction,
  RecurringPriceCondition,
  RecurringRatioAction,
  RecurringRatioCondition,
  UniV3Automan__factory,
  alignPriceToClosestUsableTick,
  convertRecurringCondition,
  fractionToBig,
  getAMMInfo,
  getRawRelativePriceFromTokenValueProportion,
  getTokenHistoricalPricesFromCoingecko,
  getTokenPriceFromCoingecko,
  getTokenPriceListFromCoingecko,
  getTokenPriceListFromCoingeckoWithAddresses,
  getTokenValueProportionFromPriceRatio,
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
  PositionDetails,
  calculateIncreaseLiquidityOptimalPriceImpact,
  calculateMintOptimalPriceImpact,
  calculateRebalancePriceImpact,
  checkPositionApprovalStatus,
  computeOperatorApprovalSlot,
  estimateRebalanceGas,
  estimateReinvestGas,
  generateAccessList,
  generatePriceConditionFromTokenValueProportion,
  generateTypedDataForPermit,
  getAllPositions,
  getAutomanReinvestCalldata,
  getERC20Overrides,
  getFeeTierDistribution,
  getIncreaseLiquidityOptimalSwapInfo,
  getLiquidityArrayForPool,
  getNPM,
  getOptimalMintSwapInfo,
  getPool,
  getPosition,
  getPositionAtPrice,
  getPublicClient,
  getRebalancedPosition,
  getReinvestedPosition,
  getTickToLiquidityMapForPool,
  getToken,
  getTokenSvg,
  isPositionInRange,
  optimalRebalance,
  projectRebalancedPositionAtPrice,
  simulateIncreaseLiquidityOptimal,
  simulateMintOptimal,
} from '../../src/viem';
import { hardhatForkProvider } from './helper/common';

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

async function resetFork(testClient: TestClient, blockNumber = 19210000n) {
  await testClient.reset({
    blockNumber,
    jsonRpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
  });
}

const infuraMap = {
  mainnet: mainnet,
  'arbitrum-mainnet': arbitrum,
};

function getInfuraClient(chain: keyof typeof infuraMap = 'mainnet') {
  return createPublicClient({
    chain: infuraMap[chain],
    transport: http(
      `https://${chain}.infura.io/v3/${process.env.INFURA_API_KEY}`,
    ),
  });
}

describe('Estimate gas tests', function () {
  async function estimateRebalanceGasWithFrom(from: Address | undefined) {
    const blockNumber = 17975698n;
    const publicClient = getInfuraClient();
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
    const publicClient = getInfuraClient();
    const amount0Desired = 100000n;
    const amount1Desired = 1000000000000000n;
    const gas = await estimateReinvestGas(
      chainId,
      publicClient,
      from,
      eoa,
      4n,
      BigInt(Math.floor(Date.now() / 1000 + 60 * 30)),
      amount0Desired,
      amount1Desired,
      BigInt(0),
      '0x',
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
        getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.UNISWAP_V3)!
          .nonfungiblePositionManager,
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
    const npm = getAMMInfo(
      chainId,
      AutomatedMarketMakerEnum.enum.UNISWAP_V3,
    )!.nonfungiblePositionManager;
    const slot = computeOperatorApprovalSlot(eoa, automanAddress);
    expect(slot).to.equal(
      '0xaf12655eb680e77b7549c03375fd65c7a46c2854e913a071f6412c5b3d693f31',
    );
    expect(await publicClient.getStorageAt({ address: npm, slot })).to.equal(
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
    expect(await publicClient.getStorageAt({ address: npm, slot })).to.equal(
      encodeAbiParameters(parseAbiParameters('bool'), [true]),
    );
  });

  it('Test generateAccessList', async function () {
    const publicClient = getInfuraClient();
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
    const publicClient = getInfuraClient();
    const amount0Desired = 1000000000000000000n;
    const amount1Desired = 100000000n;
    const { apertureAutoman } = getAMMInfo(
      chainId,
      AutomatedMarketMakerEnum.enum.UNISWAP_V3,
    )!;
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
    const publicClient = getInfuraClient();
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

    const priceImpact = await calculateMintOptimalPriceImpact({
      chainId,
      publicClient,
      from: eoa,
      mintParams,
      swapData: undefined,
      blockNumber,
    });

    expect(priceImpact.toString()).to.equal('0.003010298098311076209996397317');

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

  it('Test simulateIncreaseLiquidityOptimal', async function () {
    const blockNumber = 17975698n;
    const positionId = 4n;
    const publicClient = getInfuraClient();
    const amount0Desired = 100000000n;
    const amount1Desired = 1000000000000000000n;
    const position = await getPosition(chainId, 4n, publicClient, blockNumber);
    const increaseParams = {
      tokenId: positionId,
      amount0Desired,
      amount1Desired,
      amount0Min: BigInt(0),
      amount1Min: BigInt(0),
      deadline: BigInt(Math.floor(Date.now() / 1000 + 60 * 30)),
    };

    const priceImpact = await calculateIncreaseLiquidityOptimalPriceImpact({
      chainId,
      publicClient,
      from: eoa,
      position,
      increaseParams,
      swapData: undefined,
      blockNumber,
    });

    expect(priceImpact.toString()).to.equal('0.00300826277866017098015215935');

    const [, amount0, amount1] = await simulateIncreaseLiquidityOptimal(
      chainId,
      publicClient,
      eoa as Address,
      position,
      increaseParams,
      undefined,
      blockNumber,
    );
    expect(amount0.toString()).to.equal('61259538');
    expect(amount1.toString()).to.equal('7156958298534991565');
  });

  it('Test calculateMintOptimalPriceImpact 0 price impact', async function () {
    const blockNumber = 17975698n;
    const publicClient = getInfuraClient();
    const token0 = WBTC_ADDRESS;
    const token1 = WETH_ADDRESS;
    const fee = FeeAmount.MEDIUM;
    const amount0Desired = 96674n;
    const amount1Desired = 16468879195954429n;
    const pool = await getPool(
      token0,
      token1,
      fee,
      chainId,
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

    const priceImpact = await calculateMintOptimalPriceImpact({
      chainId,
      publicClient,
      from: eoa,
      mintParams,
      swapData: undefined,
      blockNumber,
    });

    expect(priceImpact.toString()).to.equal('0');
  });

  it('Test calculateRebalancePriceImpact', async function () {
    const blockNumber = 17975698n;
    const publicClient = getInfuraClient();

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

    const impact = await calculateRebalancePriceImpact({
      chainId,
      publicClient,
      from: eoa,
      owner: eoa,
      mintParams,
      tokenId: 4n,
      feeBips: undefined,
      swapData: undefined,
      blockNumber,
    });
    expect(impact.toString()).to.equal('0.00300526535105717178193071153');
  });
});

describe('Position util tests', function () {
  let inRangePosition: Position;
  let testClient: TestClient;
  let publicClient: PublicClient;

  beforeEach(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient, 17188000n);
    inRangePosition = await getPosition(chainId, 4n, publicClient);
  });

  it('Position approval', async function () {
    const { apertureAutoman } = getAMMInfo(
      chainId,
      AutomatedMarketMakerEnum.enum.UNISWAP_V3,
    )!;
    // This position is owned by `eoa`.
    const positionId = 4n;
    expect(
      await checkPositionApprovalStatus(
        positionId,
        undefined,
        chainId,
        publicClient,
      ),
    ).to.deep.equal({
      hasAuthority: false,
      owner: eoa,
      reason: 'missingSignedPermission',
    });

    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const npm = getNPM(chainId, undefined, walletClient);
    await npm.write.setApprovalForAll([apertureAutoman, true], {
      account: eoa,
      chain: walletClient.chain,
    });
    expect(
      await checkPositionApprovalStatus(
        positionId,
        undefined,
        chainId,
        publicClient,
      ),
    ).to.deep.equal({
      hasAuthority: true,
      owner: eoa,
      reason: 'onChainUserLevelApproval',
    });

    await npm.write.approve([apertureAutoman, positionId], {
      account: eoa,
      chain: walletClient.chain,
    });
    expect(
      await checkPositionApprovalStatus(
        positionId,
        undefined,
        chainId,
        publicClient,
      ),
    ).to.deep.include({
      hasAuthority: true,
      reason: 'onChainPositionSpecificApproval',
    });

    expect(
      await checkPositionApprovalStatus(
        0n, // Nonexistent position id.
        undefined,
        chainId,
        publicClient,
      ),
    ).to.deep.include({
      hasAuthority: false,
      reason: 'nonexistentPositionId',
    });
  });

  it('Position permit', async function () {
    const positionId = 4n;
    const account = privateKeyToAccount(TEST_WALLET_PRIVATE_KEY);
    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const npm = getNPM(chainId, undefined, walletClient);

    // Transfer position id 4 from `eoa` to the test wallet.
    await npm.write.transferFrom([eoa, account.address, positionId], {
      account: eoa,
      chain: walletClient.chain,
    });

    // Construct and sign a permit digest that approves position id 4.
    const client = createWalletClient({
      account,
      chain: mainnet,
      transport: http(),
    });
    const permitTypedData = await generateTypedDataForPermit(
      chainId,
      positionId,
      BigInt(deadline),
      publicClient,
    );
    const signature = await client.signTypedData({
      ...permitTypedData,
    });

    // Check test wallet's permit.
    expect(
      await checkPositionApprovalStatus(
        positionId,
        {
          deadline,
          signature,
        },
        chainId,
        publicClient,
      ),
    ).to.deep.include({
      hasAuthority: true,
      reason: 'offChainPositionSpecificApproval',
    });

    // Test permit message with an incorrect position id.
    const anotherPermitTypedData = await generateTypedDataForPermit(
      chainId,
      positionId + 1n,
      BigInt(deadline),
      publicClient,
    );
    const anotherSignature = await client.signTypedData({
      ...anotherPermitTypedData,
    });
    expect(
      await checkPositionApprovalStatus(
        positionId,
        {
          deadline,
          signature: anotherSignature,
        },
        chainId,
        publicClient,
      ),
    ).to.deep.include({
      hasAuthority: false,
      reason: 'invalidSignedPermission',
    });
  });

  it('Position in-range', async function () {
    const outOfRangePosition = await getPosition(chainId, 7n, publicClient);
    expect(isPositionInRange(inRangePosition)).to.equal(true);
    expect(isPositionInRange(outOfRangePosition)).to.equal(false);
  });

  it('Token Svg', async function () {
    const url = await getTokenSvg(chainId, 4n, publicClient);
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
    ).to.equal(tickToBigPrice(inRangePosition.tickUpper).toString());
    expect(
      getRawRelativePriceFromTokenValueProportion(
        inRangePosition.tickLower,
        inRangePosition.tickUpper,
        new Big('1'),
      ).toString(),
    ).to.equal(tickToBigPrice(inRangePosition.tickLower).toString());

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
    const ratio2 = getTokenValueProportionFromPriceRatio(-887220, 27720, pp);
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
      publicClient,
    );
    const colletableTokenAmounts =
      await positionDetails.getCollectableTokenAmounts(publicClient);
    expect(colletableTokenAmounts).to.deep.equal({
      token0Amount: positionDetails.tokensOwed0,
      token1Amount: positionDetails.tokensOwed1,
    });
  });

  it('Test get position details', async function () {
    const { owner, position } = await PositionDetails.fromPositionId(
      chainId,
      4n,
      publicClient,
    );
    expect(owner).to.equal(eoa);
    expect(position).to.deep.equal(
      await getPosition(chainId, 4n, publicClient),
    );
  });

  it('Test getAllPositions', async function () {
    const publicClient = getPublicClient(1);
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

  it('Test getAllPositions with large balances', async function () {
    const publicClient = getPublicClient(1);
    // An address with 7000+ positions on mainnet.
    const address = '0x6dD91BdaB368282dc4Ea4f4beFc831b78a7C38C0';
    const positionDetails = await getAllPositions(
      address,
      chainId,
      publicClient,
    );
    expect(positionDetails.size).to.greaterThan(7000);
  });

  it('Test getReinvestedPosition', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const { apertureAutoman } = getAMMInfo(
      chainId,
      AutomatedMarketMakerEnum.enum.UNISWAP_V3,
    )!;
    const jsonRpcUrl = `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;
    const publicClient = getInfuraClient('arbitrum-mainnet');
    const positionId = 761879n;
    const blockNumber = 119626480n;
    const npm = getNPM(chainId, publicClient);
    const opts = {
      blockNumber,
    };
    const owner = await npm.read.ownerOf([positionId], opts);
    expect(await npm.read.isApprovedForAll([owner, apertureAutoman], opts)).to
      .be.false;
    const [liquidity] = await getReinvestedPosition(
      chainId,
      positionId,
      publicClient,
      blockNumber,
    );
    await testClient.reset({
      blockNumber,
      jsonRpcUrl,
    });
    await testClient.impersonateAccount({ address: owner });
    const walletClient = testClient.extend(walletActions);
    await getNPM(chainId, undefined, walletClient).write.setApprovalForAll(
      [apertureAutoman, true],
      {
        account: owner,
        chain: walletClient.chain,
      },
    );
    {
      const publicClient = await hre.viem.getPublicClient();
      const { liquidity: liquidityBefore } = await getPosition(
        chainId,
        positionId,
        publicClient,
      );
      const data = getAutomanReinvestCalldata(
        positionId,
        BigInt(Math.round(new Date().getTime() / 1000 + 60 * 10)), // 10 minutes from now.
      );
      await walletClient.sendTransaction({
        account: owner,
        chain: walletClient.chain,
        to: apertureAutoman,
        data,
      });
      const { liquidity: liquidityAfter } = await getPosition(
        chainId,
        positionId,
        publicClient,
      );
      expect(
        JSBI.subtract(liquidityAfter, liquidityBefore).toString(),
      ).to.equal(liquidity.toString());
    }
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
      liquidityArr[
        liquidityArr.findIndex(({ tick }) => tick > tickCurrentAligned) - 1
      ].liquidityActive,
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

describe('Routing tests', function () {
  it('Test optimalRebalance', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const publicClient = getInfuraClient('arbitrum-mainnet');
    const tokenId = 726230n;
    const blockNumber = 119626480n;
    const { pool, position } = await PositionDetails.fromPositionId(
      chainId,
      tokenId,
      publicClient,
      blockNumber,
    );
    const tickLower = nearestUsableTick(
      pool.tickCurrent - 10 * pool.tickSpacing,
      pool.tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      pool.tickCurrent + 10 * pool.tickSpacing,
      pool.tickSpacing,
    );
    const owner = await getNPM(chainId, publicClient).read.ownerOf([tokenId]);
    const { liquidity } = await optimalRebalance(
      chainId,
      tokenId,
      tickLower,
      tickUpper,
      0n,
      true,
      owner,
      0.1,
      publicClient,
      blockNumber,
    );
    const { liquidity: predictedLiquidity } = getRebalancedPosition(
      position,
      tickLower,
      tickUpper,
    );
    expect(Number(liquidity.toString())).to.be.closeTo(
      Number(predictedLiquidity.toString()),
      Number(predictedLiquidity.toString()) * 0.1,
    );
  });
});

describe('Automan transaction tests', function () {
  async function dealERC20(
    token0: Address,
    token1: Address,
    amount0: bigint,
    amount1: bigint,
    from: Address,
    to: Address,
  ) {
    const infuraClient = getInfuraClient();
    const [token0Overrides, token1Overrides] = await Promise.all([
      getERC20Overrides(token0, from, to, amount0, infuraClient),
      getERC20Overrides(token1, from, to, amount1, infuraClient),
    ]);
    for (const slot of Object.keys(token0Overrides[token0].stateDiff!)) {
      await hardhatForkProvider.send('hardhat_setStorageAt', [
        token0,
        slot,
        defaultAbiCoder.encode(['uint256'], [amount0]),
      ]);
    }
    for (const slot of Object.keys(token1Overrides[token1].stateDiff!)) {
      await hardhatForkProvider.send('hardhat_setStorageAt', [
        token1,
        slot,
        defaultAbiCoder.encode(['uint256'], [amount1]),
      ]);
    }
  }

  it('Optimal mint no need swap', async function () {
    const testClient = await hre.viem.getTestClient();
    const publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient);
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.MEDIUM,
      chainId,
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
      getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.UNISWAP_V3)!
        .apertureAutoman,
    );
    const { swapRoute } = await getOptimalMintSwapInfo(
      chainId,
      hypotheticalPosition.amount0,
      hypotheticalPosition.amount1,
      FeeAmount.MEDIUM,
      tickLower,
      tickUpper,
      eoa,
      BigInt(Math.floor(Date.now() / 1000) + 60),
      0.5,
      publicClient,
      new providers.MulticallProvider(hardhatForkProvider),
      // 1inch quote currently doesn't support the no-swap case.
      false,
    );

    expect(swapRoute?.length).to.equal(0);
  });

  it('Increase liquidity optimal no need swap', async function () {
    const testClient = await hre.viem.getTestClient();
    const publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient);
    const pool = await getPool(
      WBTC_ADDRESS,
      WETH_ADDRESS,
      FeeAmount.MEDIUM,
      chainId,
      publicClient,
    );
    const positionId = 4;
    const [, , , , , tickLower, tickUpper] = await getNPM(
      chainId,
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
      getAMMInfo(chainId, AutomatedMarketMakerEnum.enum.UNISWAP_V3)!
        .apertureAutoman,
    );

    const { swapRoute } = await getIncreaseLiquidityOptimalSwapInfo(
      {
        tokenId: positionId,
        slippageTolerance: new Percent(5, 1000),
        deadline: Math.floor(Date.now() / 1000 + 60 * 30),
      },
      chainId,
      hypotheticalPosition.amount0,
      hypotheticalPosition.amount1,
      eoa as Address,
      publicClient,
      new providers.MulticallProvider(hardhatForkProvider),
      hypotheticalPosition,
      // 1inch quote currently doesn't support the no-swap case.
      false,
    );

    expect(swapRoute?.length).to.equal(0);
  });
});
