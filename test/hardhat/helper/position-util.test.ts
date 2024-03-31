import { reset as hardhatReset } from '@nomicfoundation/hardhat-network-helpers';
import {
  FeeAmount,
  Pool,
  Position,
  TICK_SPACINGS,
  TickMath,
  tickToPrice,
} from '@uniswap/v3-sdk';
import Big from 'big.js';
import { ethers } from 'hardhat';
import JSBI from 'jsbi';

import {
  ApertureSupportedChainId,
  ConditionTypeEnum,
  PriceConditionSchema,
  Q192,
  fractionToBig,
  getChainInfoAMM,
  getRawRelativePriceFromTokenValueProportion,
  getTokenValueProportionFromPriceRatio,
} from '../../../src';
import {
  PositionDetails,
  checkPositionApprovalStatus,
  generatePriceConditionFromTokenValueProportion,
  generateTypedDataForPermit,
  getAllPositionBasicInfoByOwner,
  getAllPositionsDetails,
  getAutomanReinvestCallInfo,
  getBasicPositionInfo,
  getCollectableTokenAmounts,
  getNPM,
  getPosition,
  getPositionAtPrice,
  getPublicProvider,
  getRebalancedPosition,
  getReinvestedPosition,
  getTokenSvg,
  isPositionInRange,
  projectRebalancedPositionAtPrice,
  viewCollectableTokenAmounts,
} from '../../../src/helper';
import {
  TEST_WALLET_PRIVATE_KEY,
  chainId,
  deadline,
  eoa,
  expect,
  hardhatForkProvider,
  resetHardhatNetwork,
} from './common';

describe('Helper - Position util tests', function () {
  let inRangePosition: Position;

  beforeEach(async function () {
    await resetHardhatNetwork();
    inRangePosition = await getPosition(chainId, 4, hardhatForkProvider);
  });

  it('Position approval', async function () {
    const automanAddress =
      getChainInfoAMM(chainId).ammToInfo.get('UNISWAP')?.apertureAutoman!;
    // This position is owned by `eoa`.
    const positionId = 4;
    expect(
      await checkPositionApprovalStatus(
        positionId,
        undefined,
        chainId,
        hardhatForkProvider,
      ),
    ).to.deep.equal({
      hasAuthority: false,
      owner: eoa,
      reason: 'missingSignedPermission',
    });

    const npm = getNPM(chainId, await ethers.getImpersonatedSigner(eoa));
    await npm.setApprovalForAll(automanAddress, true);
    expect(
      await checkPositionApprovalStatus(
        positionId,
        undefined,
        chainId,
        hardhatForkProvider,
      ),
    ).to.deep.equal({
      hasAuthority: true,
      owner: eoa,
      reason: 'onChainUserLevelApproval',
    });

    await npm.approve(automanAddress, positionId);
    expect(
      await checkPositionApprovalStatus(
        positionId,
        undefined,
        chainId,
        hardhatForkProvider,
      ),
    ).to.deep.include({
      hasAuthority: true,
      reason: 'onChainPositionSpecificApproval',
    });

    expect(
      await checkPositionApprovalStatus(
        0, // Nonexistent position id.
        undefined,
        chainId,
        hardhatForkProvider,
      ),
    ).to.deep.include({
      hasAuthority: false,
      reason: 'nonexistentPositionId',
    });

    // Construct and sign a permit digest that approves position id 4.
    const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY);
    const permitTypedData = await generateTypedDataForPermit(
      chainId,
      positionId,
      deadline,
      hardhatForkProvider,
    );
    const signature = await wallet._signTypedData(
      permitTypedData.domain,
      permitTypedData.types,
      permitTypedData.value,
    );

    // Transfer position id 4 from `eoa` to the test wallet.
    await npm.transferFrom(eoa, wallet.address, positionId);

    // Check test wallet's permit.
    expect(
      await checkPositionApprovalStatus(
        positionId,
        {
          deadline,
          signature,
        },
        chainId,
        hardhatForkProvider,
      ),
    ).to.deep.include({
      hasAuthority: true,
      reason: 'offChainPositionSpecificApproval',
    });

    // Test permit message with an incorrect position id.
    const anotherPermitTypedData = await generateTypedDataForPermit(
      chainId,
      positionId + 1,
      deadline,
      hardhatForkProvider,
    );
    const anotherSignature = await wallet._signTypedData(
      anotherPermitTypedData.domain,
      anotherPermitTypedData.types,
      anotherPermitTypedData.value,
    );
    expect(
      await checkPositionApprovalStatus(
        positionId,
        {
          deadline,
          signature: anotherSignature,
        },
        chainId,
        hardhatForkProvider,
      ),
    ).to.deep.include({
      hasAuthority: false,
      reason: 'invalidSignedPermission',
    });
  });

  it('Position in-range', async function () {
    const outOfRangePosition = await getPosition(
      chainId,
      7,
      hardhatForkProvider,
    );
    expect(isPositionInRange(inRangePosition)).to.equal(true);
    expect(isPositionInRange(outOfRangePosition)).to.equal(false);
  });

  it('Token Svg', async function () {
    const url = await getTokenSvg(chainId, 4, hardhatForkProvider);
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
    const positionId = 4;
    const position = await getBasicPositionInfo(
      chainId,
      positionId,
      hardhatForkProvider,
    );
    const colletableTokenAmounts = await getCollectableTokenAmounts(
      chainId,
      positionId,
      hardhatForkProvider,
      position,
    );
    const viewOnlyColletableTokenAmounts = await viewCollectableTokenAmounts(
      chainId,
      positionId,
      hardhatForkProvider,
      position,
    );
    expect(colletableTokenAmounts).to.deep.equal(
      viewOnlyColletableTokenAmounts,
    );
    const positionDetails = await PositionDetails.fromPositionId(
      chainId,
      positionId,
      hardhatForkProvider,
    );
    expect(colletableTokenAmounts).to.deep.equal({
      token0Amount: positionDetails.tokensOwed0,
      token1Amount: positionDetails.tokensOwed1,
    });
  });

  it('Test get position details', async function () {
    const { owner, position } = await PositionDetails.fromPositionId(
      chainId,
      4,
      hardhatForkProvider,
    );
    expect(owner).to.equal(eoa);
    expect(position).to.deep.equal(
      await getPosition(chainId, 4, hardhatForkProvider),
    );
  });

  it('Test getAllPositions', async function () {
    const provider = getPublicProvider(5);
    // an address with 90+ positions
    const address = '0xD68C7F0b57476D5C9e5686039FDFa03f51033a4f';
    const positions = await getAllPositionsDetails(address, chainId, provider);
    const basicPositions = await getAllPositionBasicInfoByOwner(
      address,
      chainId,
      provider,
    );
    expect(positions.size).to.equal(basicPositions.size);
    for (const [tokenId, pos] of positions.entries()) {
      const basicPosition = basicPositions.get(tokenId);
      expect(basicPosition).to.not.be.undefined;
      expect(basicPosition?.token0).to.deep.equal(pos.pool.token0);
      expect(basicPosition?.token1).to.deep.equal(pos.pool.token1);
      expect(basicPosition?.fee).to.equal(pos.pool.fee);
      expect(basicPosition?.liquidity).to.equal(pos.liquidity.toString());
      expect(basicPosition?.tickLower).to.equal(pos.tickLower);
      expect(basicPosition?.tickUpper).to.equal(pos.tickUpper);
    }
  });

  it('Test getReinvestedPosition', async function () {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const { apertureAutoman } =
      getChainInfoAMM(chainId).ammToInfo.get('UNISWAP')!;
    const provider = new ethers.providers.InfuraProvider(chainId);
    const positionId = 761879;
    const blockTag = 119626480;
    const npm = getNPM(chainId, provider);
    const opts = { blockTag };
    const owner = await npm.ownerOf(positionId, opts);
    expect(await npm.isApprovedForAll(owner, apertureAutoman, opts)).to.be
      .false;
    const { liquidity } = await getReinvestedPosition(
      chainId,
      positionId,
      provider,
      blockTag,
    );
    await hardhatReset(
      `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      blockTag,
    );
    const signer = await ethers.getImpersonatedSigner(owner);
    await npm.connect(signer).setApprovalForAll(apertureAutoman, true);
    const { liquidity: liquidityBefore } = await getPosition(
      chainId,
      positionId,
      hardhatForkProvider,
    );
    const { data } = getAutomanReinvestCallInfo(
      positionId,
      Math.round(new Date().getTime() / 1000 + 60 * 10), // 10 minutes from now.
    );
    await signer.sendTransaction({
      from: owner,
      to: apertureAutoman,
      data,
    });
    const { liquidity: liquidityAfter } = await getPosition(
      chainId,
      positionId,
      hardhatForkProvider,
    );
    expect(JSBI.subtract(liquidityAfter, liquidityBefore).toString()).to.equal(
      liquidity.toString(),
    );
  });
});
