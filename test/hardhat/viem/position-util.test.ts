import {
  FeeAmount,
  Pool,
  Position,
  TICK_SPACINGS,
  tickToPrice,
} from '@aperture_finance/uniswap-v3-sdk';
import '@nomicfoundation/hardhat-viem';
import Big from 'big.js';
import hre from 'hardhat';
import JSBI from 'jsbi';
import {
  PublicClient,
  TestClient,
  createWalletClient,
  http,
  walletActions,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

import {
  ApertureSupportedChainId,
  ConditionTypeEnum,
  PriceConditionSchema,
  fractionToBig,
  getAMMInfo,
  getRawRelativePriceFromTokenValueProportion,
  getTokenValueProportionFromPriceRatio,
  tickToBigPrice,
} from '../../../src';
import {
  PositionDetails,
  checkPositionApprovalStatus,
  generatePriceConditionFromTokenValueProportion,
  generateTypedDataForPermit,
  getAllPositions,
  getAutomanReinvestCalldata,
  getNPM,
  getPosition,
  getPositionAtPrice,
  getPublicClient,
  getRebalancedPosition,
  getReinvestedPosition,
  getTokenSvg,
  isPositionInRange,
  projectRebalancedPositionAtPrice,
  viewCollectableTokenAmounts,
} from '../../../src/viem';
import {
  TEST_WALLET_PRIVATE_KEY,
  UNIV3_AMM,
  chainId,
  deadline,
  eoa,
  expect,
  getInfuraClient,
  resetFork,
} from '../common';

describe('Position util tests', function () {
  let inRangePosition: Position;
  let testClient: TestClient;
  let publicClient: PublicClient;

  beforeEach(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient, 17188000n);
    inRangePosition = await getPosition(chainId, UNIV3_AMM, 4n, publicClient);
  });

  it('Position approval', async function () {
    const { apertureAutoman } = getAMMInfo(chainId, UNIV3_AMM)!;
    // This position is owned by `eoa`.
    const positionId = 4n;
    expect(
      await checkPositionApprovalStatus(
        positionId,
        undefined,
        chainId,
        UNIV3_AMM,
        publicClient,
      ),
    ).to.deep.equal({
      hasAuthority: false,
      owner: eoa,
      reason: 'missingSignedPermission',
    });

    await testClient.impersonateAccount({ address: eoa });
    const walletClient = testClient.extend(walletActions);
    const npm = getNPM(chainId, UNIV3_AMM, undefined, walletClient);
    await npm.write.setApprovalForAll([apertureAutoman, true], {
      account: eoa,
      chain: walletClient.chain,
    });
    expect(
      await checkPositionApprovalStatus(
        positionId,
        undefined,
        chainId,
        UNIV3_AMM,
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
        UNIV3_AMM,
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
        UNIV3_AMM,
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
    const npm = getNPM(chainId, UNIV3_AMM, undefined, walletClient);

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
      UNIV3_AMM,
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
        UNIV3_AMM,
        publicClient,
      ),
    ).to.deep.include({
      hasAuthority: true,
      reason: 'offChainPositionSpecificApproval',
    });

    // Test permit message with an incorrect position id.
    const anotherPermitTypedData = await generateTypedDataForPermit(
      chainId,
      UNIV3_AMM,
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
        UNIV3_AMM,
        publicClient,
      ),
    ).to.deep.include({
      hasAuthority: false,
      reason: 'invalidSignedPermission',
    });
  });

  it('Position in-range', async function () {
    const outOfRangePosition = await getPosition(
      chainId,
      UNIV3_AMM,
      7n,
      publicClient,
    );
    expect(isPositionInRange(inRangePosition)).to.equal(true);
    expect(isPositionInRange(outOfRangePosition)).to.equal(false);
  });

  it('Token Svg', async function () {
    const url = await getTokenSvg(chainId, UNIV3_AMM, 4n, publicClient);
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
    const publicClient = getPublicClient(
      ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
      `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    );
    const positionId = 723522n;
    const blockNumber = 20064066n;
    const viewAccruedFeeAmounts = await viewCollectableTokenAmounts(
      ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
      'UNISWAP_V3',
      positionId,
      publicClient,
      blockNumber,
    );
    expect(viewAccruedFeeAmounts.token0Amount.toFixed(10)).to.equal(
      '1505323.1236760710',
    );
    expect(viewAccruedFeeAmounts.token1Amount.toFixed(10)).to.equal(
      '0.0048152808',
    );
  });

  it('Test get position details', async function () {
    const { owner, position } = await PositionDetails.fromPositionId(
      chainId,
      UNIV3_AMM,
      4n,
      publicClient,
    );
    expect(owner).to.equal(eoa);
    expect(position).to.deep.equal(
      await getPosition(chainId, UNIV3_AMM, 4n, publicClient),
    );
  });

  it('Test getAllPositions', async function () {
    const publicClient = getPublicClient(1, 'https://ethereum.publicnode.com');
    // an address with 24 positions
    const address = '0x4bD047CA72fa05F0B89ad08FE5Ba5ccdC07DFFBF';

    const positionDetails = await getAllPositions(
      address,
      chainId,
      UNIV3_AMM,
      publicClient,
    );
    const npm = getNPM(chainId, UNIV3_AMM, publicClient);
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
            await getPosition(chainId, UNIV3_AMM, positionId, publicClient),
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
    const publicClient = getPublicClient(1, 'https://ethereum.publicnode.com');
    // An address with 7000+ positions on mainnet.
    const address = '0x6dD91BdaB368282dc4Ea4f4beFc831b78a7C38C0';
    const positionDetails = await getAllPositions(
      address,
      chainId,
      UNIV3_AMM,
      publicClient,
    );
    expect(positionDetails.size).to.greaterThan(7000);
  });

  it('Test getReinvestedPosition', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const { apertureAutoman } = getAMMInfo(chainId, UNIV3_AMM)!;
    const jsonRpcUrl = `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;
    const publicClient = getInfuraClient('arbitrum-mainnet');
    const positionId = 761879n;
    const blockNumber = 119626480n;
    const npm = getNPM(chainId, UNIV3_AMM, publicClient);
    const opts = {
      blockNumber,
    };
    const owner = await npm.read.ownerOf([positionId], opts);
    expect(await npm.read.isApprovedForAll([owner, apertureAutoman], opts)).to
      .be.false;
    const [liquidity] = await getReinvestedPosition(
      chainId,
      UNIV3_AMM,
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
    await getNPM(
      chainId,
      UNIV3_AMM,
      undefined,
      walletClient,
    ).write.setApprovalForAll([apertureAutoman, true], {
      account: owner,
      chain: walletClient.chain,
    });
    {
      const publicClient = await hre.viem.getPublicClient();
      const { liquidity: liquidityBefore } = await getPosition(
        chainId,
        UNIV3_AMM,
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
        UNIV3_AMM,
        positionId,
        publicClient,
      );
      expect(
        JSBI.subtract(liquidityAfter, liquidityBefore).toString(),
      ).to.equal(liquidity.toString());
    }
  });
});
