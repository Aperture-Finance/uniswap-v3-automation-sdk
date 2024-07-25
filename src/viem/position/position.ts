import {
  ApertureSupportedChainId,
  Automan__factory,
  INonfungiblePositionManager__factory,
  fractionToBig,
  getAMMInfo,
  getTokenValueProportionFromPriceRatio,
  priceToSqrtRatioX96,
} from '@/index';
import {
  FeeAmount,
  Pool,
  Position,
  PositionLibrary,
  TickMath,
} from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { EphemeralGetPosition__factory, viem } from 'aperture-lens';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import JSBI from 'jsbi';
import {
  AbiStateMutability,
  Address,
  ContractFunctionReturnType,
  GetContractReturnType,
  PublicClient,
  WalletClient,
  decodeFunctionResult,
  getAddress,
  getContract,
} from 'viem';

import { getAutomanReinvestCalldata } from '../automan';
import { getNPMApprovalOverrides, staticCallWithOverrides } from '../overrides';
import {
  getPool,
  getPoolContract,
  getPoolFromBasicPositionInfo,
} from '../pool';
import { getPublicClient } from '../public_client';

export interface BasicPositionInfo {
  token0: Token;
  token1: Token;
  fee?: number;
  tickSpacing?: number;
  liquidity?: string;
  tickLower: number;
  tickUpper: number;
}

export interface CollectableTokenAmounts {
  token0Amount: CurrencyAmount<Token>;
  token1Amount: CurrencyAmount<Token>;
}

type PositionStateStruct = ContractFunctionReturnType<
  typeof EphemeralGetPosition__factory.abi,
  AbiStateMutability,
  'getPosition'
>;

export function getNPM(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient?: PublicClient,
  walletClient?: WalletClient,
): GetContractReturnType<
  typeof INonfungiblePositionManager__factory.abi,
  PublicClient | WalletClient
> {
  return getContract({
    address: getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
    abi: INonfungiblePositionManager__factory.abi,
    client: walletClient ?? publicClient!,
  });
}

export async function getPositionFromBasicInfo(
  basicInfo: BasicPositionInfo,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient?: PublicClient,
  blockNumber?: bigint,
): Promise<Position> {
  if (basicInfo.liquidity === undefined) {
    throw 'Missing position liquidity info';
  }
  return new Position({
    pool: await getPoolFromBasicPositionInfo(
      basicInfo,
      chainId,
      amm,
      publicClient,
      blockNumber,
    ),
    liquidity: basicInfo.liquidity,
    tickLower: basicInfo.tickLower,
    tickUpper: basicInfo.tickUpper,
  });
}

/**
 * Get the Uniswap `Position` object for the specified position id.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param positionId The position id.
 * @param publicClient Viem public client.
 * @param blockNumber Optional block number to query.
 * @returns The `Position` object.
 */
export async function getPosition(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionId: bigint,
  publicClient?: PublicClient,
  blockNumber?: bigint,
) {
  publicClient = publicClient ?? getPublicClient(chainId);
  const [
    ,
    ,
    token0,
    token1,
    feeOrTickSpacing,
    tickLower,
    tickUpper,
    liquidity,
  ] = await getNPM(chainId, amm, publicClient).read.positions([positionId], {
    blockNumber,
  });

  return new Position({
    pool: await getPool(
      token0,
      token1,
      feeOrTickSpacing,
      chainId,
      amm,
      publicClient,
      blockNumber,
    ),
    liquidity: liquidity.toString(),
    tickLower: tickLower,
    tickUpper: tickUpper,
  });
}

/**
 * Contains the full position details including the corresponding pool and real-time collectable token amounts.
 */
export class PositionDetails implements BasicPositionInfo {
  public readonly tokenId: string;
  public readonly owner: Address;
  public readonly token0: Token;
  public readonly token1: Token;
  public readonly fee?: number;
  public readonly tickSpacing?: number;
  public readonly liquidity: string;
  public readonly tickLower: number;
  public readonly tickUpper: number;
  public readonly pool: Pool;
  public readonly position: Position;
  private readonly _tokensOwed0: bigint;
  private readonly _tokensOwed1: bigint;

  private constructor(
    tokenId: bigint,
    owner: Address,
    basicPositionInfo: BasicPositionInfo,
    sqrtRatioX96: bigint,
    tick: number,
    activeLiquidity: bigint,
    tokensOwed0: bigint,
    tokensOwed1: bigint,
  ) {
    this.tokenId = tokenId.toString();
    this.owner = getAddress(owner);
    this.token0 = basicPositionInfo.token0;
    this.token1 = basicPositionInfo.token1;
    this.fee = basicPositionInfo.fee;
    this.tickSpacing = basicPositionInfo.tickSpacing;
    this.liquidity = basicPositionInfo.liquidity!;
    this.tickLower = basicPositionInfo.tickLower;
    this.tickUpper = basicPositionInfo.tickUpper;
    this.pool = new Pool(
      this.token0,
      this.token1,
      this.fee,
      sqrtRatioX96.toString(),
      activeLiquidity.toString(),
      tick,
      undefined,
      this.tickSpacing,
    );
    this.position = new Position({
      pool: this.pool,
      liquidity: this.liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
    });
    this._tokensOwed0 = tokensOwed0;
    this._tokensOwed1 = tokensOwed1;
  }

  /**
   * Get the position details in a single call by deploying an ephemeral contract via `eth_call`
   * @param chainId Chain id.
   * @param amm Automated market maker.
   * @param positionId Position id.
   * @param publicClient Viem public client.
   * @param blockNumber Optional block number to query.
   * @returns The position details.
   */
  public static async fromPositionId(
    chainId: ApertureSupportedChainId,
    amm: AutomatedMarketMakerEnum,
    positionId: bigint,
    publicClient?: PublicClient,
    blockNumber?: bigint,
  ): Promise<PositionDetails> {
    const position = await viem.getPositionDetails(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      positionId,
      publicClient ?? getPublicClient(chainId),
      blockNumber,
    );
    return PositionDetails.fromPositionStateStruct(chainId, position);
  }

  /**
   * Get the position details from the position state struct.
   * @param chainId The chain ID.
   * @param tokenId The token ID.
   * @param owner The position owner.
   * @param position NonfungiblePositionManager's position struct.
   * @param slot0 The pool's slot0 struct.
   * @param activeLiquidity The pool's active liquidity.
   * @param decimals0 token0's decimals.
   * @param decimals1 token1's decimals.
   * @returns The position details.
   */
  public static fromPositionStateStruct(
    chainId: ApertureSupportedChainId,
    {
      tokenId,
      owner,
      position,
      slot0,
      activeLiquidity,
      decimals0,
      decimals1,
    }: PositionStateStruct,
  ): PositionDetails {
    return new PositionDetails(
      tokenId,
      owner,
      {
        token0: new Token(chainId, position.token0, decimals0),
        token1: new Token(chainId, position.token1, decimals1),
        fee: position.fee,
        tickSpacing: position.tickSpacing,
        liquidity: position.liquidity.toString(),
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
      },
      slot0.sqrtPriceX96,
      slot0.tick,
      activeLiquidity,
      position.tokensOwed0,
      position.tokensOwed1,
    );
  }

  /**
   * Returns the chain ID of the tokens in the pool.
   */
  public get chainId(): number {
    return this.token0.chainId;
  }

  public get tokensOwed0(): CurrencyAmount<Token> {
    return CurrencyAmount.fromRawAmount(
      this.token0,
      this._tokensOwed0.toString(),
    );
  }

  public get tokensOwed1(): CurrencyAmount<Token> {
    return CurrencyAmount.fromRawAmount(
      this.token1,
      this._tokensOwed1.toString(),
    );
  }

  /**
   * Get the real-time collectable token amounts.
   * @param amm Automated Market Maker.
   * @param publicClient Viem public client.
   * @param blockNumber Optional block number to query.
   * @returns The collectable token amounts.
   */
  public async getCollectableTokenAmounts(
    amm: AutomatedMarketMakerEnum,
    publicClient?: PublicClient,
    blockNumber?: bigint,
  ): Promise<CollectableTokenAmounts> {
    publicClient = publicClient ?? getPublicClient(this.chainId);
    return viewCollectableTokenAmounts(
      this.chainId,
      amm,
      BigInt(this.tokenId),
      publicClient,
      this,
      blockNumber,
    );
  }
}

export async function getBasicPositionInfo(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionId: bigint,
  publicClient?: PublicClient,
  blockNumber?: bigint,
): Promise<BasicPositionInfo> {
  const position = await getPosition(
    chainId,
    amm,
    positionId,
    publicClient,
    blockNumber,
  );
  return {
    token0: position.pool.token0,
    token1: position.pool.token1,
    fee: position.pool.fee,
    tickSpacing: position.pool.tickSpacing,
    liquidity: position.liquidity.toString(),
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  };
}

export async function viewCollectableTokenAmounts(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionId: bigint,
  publicClient?: PublicClient,
  basicPositionInfo?: BasicPositionInfo,
  blockNumber?: bigint,
): Promise<CollectableTokenAmounts> {
  if (basicPositionInfo === undefined) {
    basicPositionInfo = await getBasicPositionInfo(
      chainId,
      amm,
      positionId,
      publicClient,
      blockNumber,
    );
  }

  const pool = getPoolContract(
    basicPositionInfo.token0,
    basicPositionInfo.token1,
    basicPositionInfo.fee,
    chainId,
    amm,
    publicClient,
  );
  const opts = { blockNumber };
  const [
    slot0,
    feeGrowthGlobal0X128,
    feeGrowthGlobal1X128,
    lower,
    upper,
    position,
  ] = await Promise.all([
    pool.read.slot0(opts),
    pool.read.feeGrowthGlobal0X128(opts),
    pool.read.feeGrowthGlobal1X128(opts),
    pool.read.ticks([basicPositionInfo.tickLower], opts),
    pool.read.ticks([basicPositionInfo.tickUpper], opts),
    getNPM(chainId, amm, publicClient).read.positions(
      [BigInt(positionId)],
      opts,
    ),
  ]);
  const tick = slot0[1];
  const [, , feeGrowthOutside0X128Lower, feeGrowthOutside1X128Lower] = lower;
  const [, , feeGrowthOutside0X128Upper, feeGrowthOutside1X128Upper] = upper;

  let feeGrowthInside0X128: bigint, feeGrowthInside1X128: bigint;
  // https://github.com/Uniswap/v4-core/blob/f630c8ca8c669509d958353200953762fd15761a/contracts/libraries/Pool.sol#L566
  if (tick < basicPositionInfo.tickLower) {
    feeGrowthInside0X128 =
      feeGrowthOutside0X128Lower - feeGrowthOutside0X128Upper;
    feeGrowthInside1X128 =
      feeGrowthOutside1X128Lower - feeGrowthOutside1X128Upper;
  } else if (tick >= basicPositionInfo.tickUpper) {
    feeGrowthInside0X128 =
      feeGrowthOutside0X128Upper - feeGrowthOutside0X128Lower;
    feeGrowthInside1X128 =
      feeGrowthOutside1X128Upper - feeGrowthOutside1X128Lower;
  } else {
    feeGrowthInside0X128 =
      feeGrowthGlobal0X128 -
      feeGrowthOutside0X128Lower -
      feeGrowthOutside0X128Upper;
    feeGrowthInside1X128 =
      feeGrowthGlobal1X128 -
      feeGrowthOutside1X128Lower -
      feeGrowthOutside1X128Upper;
  }
  const [
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    liquidity,
    feeGrowthInside0LastX128,
    feeGrowthInside1LastX128,
    tokensOwed0,
    tokensOwed1,
  ] = position;
  const [fees0, fees1] = PositionLibrary.getTokensOwed(
    JSBI.BigInt(feeGrowthInside0LastX128.toString()),
    JSBI.BigInt(feeGrowthInside1LastX128.toString()),
    JSBI.BigInt(liquidity.toString()),
    JSBI.BigInt(feeGrowthInside0X128.toString()),
    JSBI.BigInt(feeGrowthInside1X128.toString()),
  );
  return {
    token0Amount: CurrencyAmount.fromRawAmount(
      basicPositionInfo.token0,
      (tokensOwed0 + BigInt(fees0.toString())).toString(),
    ),
    token1Amount: CurrencyAmount.fromRawAmount(
      basicPositionInfo.token1,
      (tokensOwed1 + BigInt(fees1.toString())).toString(),
    ),
  };
}

/**
 * Check whether the specified position is currently in range, i.e. pool price is within the position's price range.
 * @param position The position to check.
 * @returns A boolean indicating whether the position is in range.
 */
export function isPositionInRange(position: Position): boolean {
  return (
    position.pool.tickCurrent >= position.tickLower &&
    position.pool.tickCurrent < position.tickUpper
  );
}

/**
 * Get the token SVG URL of the specified position.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param positionId Position id.
 * @param publicClient Viem public client.
 * @param blockNumber Optional block number to query.
 * @returns A promise that resolves to the token SVG URL.
 */
export async function getTokenSvg(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionId: bigint,
  publicClient?: PublicClient,
  blockNumber?: bigint,
): Promise<URL> {
  const npm = getNPM(chainId, amm, publicClient);
  const uri = await npm.read.tokenURI([positionId], { blockNumber });
  const json_uri = Buffer.from(
    uri.replace('data:application/json;base64,', ''),
    'base64',
  ).toString('utf-8');
  return new URL(JSON.parse(json_uri).image);
}

/**
 * Predict the position after rebalance assuming the pool price remains the same.
 * @param position Position info before rebalance.
 * @param newTickLower The new lower tick.
 * @param newTickUpper The new upper tick.
 * @returns The position info after rebalance.
 */
export function getRebalancedPosition(
  position: Position,
  newTickLower: number,
  newTickUpper: number,
): Position {
  const price = position.pool.token0Price;
  // Calculate the position equity denominated in token1 before rebalance.
  const equityInToken1Before = price
    .quote(position.amount0)
    .add(position.amount1);
  const equityBefore = fractionToBig(equityInToken1Before);
  const bigPrice = fractionToBig(price);
  const token0Proportion = getTokenValueProportionFromPriceRatio(
    newTickLower,
    newTickUpper,
    bigPrice,
  );
  const amount1After = new Big(1).sub(token0Proportion).mul(equityBefore);
  // token0's equity denominated in token1 divided by the price
  const amount0After = new Big(equityBefore).sub(amount1After).div(bigPrice);
  return Position.fromAmounts({
    pool: position.pool,
    tickLower: newTickLower,
    tickUpper: newTickUpper,
    amount0: amount0After.toFixed(0),
    amount1: amount1After.toFixed(0),
    useFullPrecision: false,
  });
}

/**
 * Predict the position if the pool price becomes the specified price.
 * @param position Position info.
 * @param newPrice The new pool price.
 * @returns The position info after the pool price becomes the specified price.
 */
export function getPositionAtPrice(
  position: Position,
  newPrice: Big,
): Position {
  const sqrtPriceX96 = priceToSqrtRatioX96(newPrice);
  const poolAtNewPrice = new Pool(
    position.pool.token0,
    position.pool.token1,
    position.pool.fee,
    sqrtPriceX96,
    position.pool.liquidity,
    TickMath.getTickAtSqrtRatio(sqrtPriceX96),
  );
  return new Position({
    pool: poolAtNewPrice,
    liquidity: position.liquidity,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  });
}

/**
 * Predict the position after rebalance assuming the pool price becomes the specified price.
 * @param position Position info before rebalance.
 * @param newPrice The pool price at rebalance.
 * @param newTickLower The new lower tick.
 * @param newTickUpper The new upper tick.
 * @returns The position info after rebalance.
 */
export function projectRebalancedPositionAtPrice(
  position: Position,
  newPrice: Big,
  newTickLower: number,
  newTickUpper: number,
): Position {
  return getRebalancedPosition(
    getPositionAtPrice(position, newPrice),
    newTickLower,
    newTickUpper,
  );
}

/**
 * Predict the change in liquidity and token amounts after a reinvestment without a prior approval.
 * https://github.com/dragonfly-xyz/useful-solidity-patterns/blob/main/patterns/eth_call-tricks/README.md#geth-overrides
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param positionId The position id.
 * @param publicClient Viem public client.
 * @param blockNumber Optional block number to query.
 * @returns The predicted change in liquidity and token amounts.
 */
export async function getReinvestedPosition(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionId: bigint,
  publicClient: PublicClient,
  blockNumber?: bigint,
): Promise<readonly [liquidity: bigint, amount0: bigint, amount1: bigint]> {
  const owner = await getNPM(chainId, amm, publicClient).read.ownerOf(
    [positionId],
    {
      blockNumber,
    },
  );
  const data = getAutomanReinvestCalldata(
    positionId,
    BigInt(Math.round(new Date().getTime() / 1000 + 60 * 10)), // 10 minutes from now.
  );
  const returnData = await staticCallWithOverrides(
    {
      from: owner,
      to: getAMMInfo(chainId, amm)!.apertureAutoman,
      data,
    },
    // forge an operator approval using state overrides.
    getNPMApprovalOverrides(chainId, amm, owner),
    publicClient,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: Automan__factory.abi,
    functionName: 'reinvest',
    data: returnData,
  });
}
