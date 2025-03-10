import {
  ApertureSupportedChainId,
  Automan__factory,
  fractionToBig,
  getAMMInfo,
  getTokenValueProportionFromPriceRatio,
  priceToSqrtRatioX96,
} from '@/index';
import { Pool, Position, TickMath } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import {
  EphemeralGetPosition__factory,
  ISlipStreamNonfungiblePositionManager__factory,
  IUniswapV3NonfungiblePositionManager__factory,
  viem,
} from 'aperture-lens';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
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
import { getToken } from '../currency';
import { getNPMApprovalOverrides, staticCallWithOverrides } from '../overrides';
import { getPool, getPoolFromBasicPositionInfo } from '../pool';
import { getPublicClient } from '../public_client';

export interface BasicPositionInfo {
  token0: Token;
  token1: Token;
  fee: number;
  tickSpacing: number;
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
  | typeof ISlipStreamNonfungiblePositionManager__factory.abi
  | typeof IUniswapV3NonfungiblePositionManager__factory.abi,
  PublicClient | WalletClient
> {
  return getContract({
    address: getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
    abi:
      amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
        ? ISlipStreamNonfungiblePositionManager__factory.abi
        : IUniswapV3NonfungiblePositionManager__factory.abi,
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
  public readonly fee: number;
  public readonly tickSpacing: number;
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
      amm,
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      positionId,
      publicClient ?? getPublicClient(chainId),
      blockNumber,
    );
    const [token0, token1] = await Promise.all([
      getToken(
        position.position.token0,
        chainId,
        publicClient,
        blockNumber,
        /* showSymbolAndName= */ true,
      ),
      getToken(
        position.position.token1,
        chainId,
        publicClient,
        blockNumber,
        /* showSymbolAndName= */ true,
      ),
    ]);
    return PositionDetails.fromPositionStateStruct(
      chainId,
      position,
      token0,
      token1,
    );
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
      poolFee,
      poolTickSpacing,
      slot0,
      activeLiquidity,
      decimals0,
      decimals1,
    }: PositionStateStruct,
    token0: Token | undefined = undefined,
    token1: Token | undefined = undefined,
  ): PositionDetails {
    return new PositionDetails(
      tokenId,
      owner,
      {
        token0: token0 ?? new Token(chainId, position.token0, decimals0),
        token1: token1 ?? new Token(chainId, position.token1, decimals1),
        fee: poolFee,
        tickSpacing: poolTickSpacing,
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

export function viewCollectableTokenAmountsFromPositionStateStruct(
  chainId: ApertureSupportedChainId,
  positionState: PositionStateStruct,
  token0: Token | undefined = undefined,
  token1: Token | undefined = undefined,
): CollectableTokenAmounts {
  return {
    token0Amount: CurrencyAmount.fromRawAmount(
      token0 ??
        new Token(
          chainId,
          positionState.position.token0,
          positionState.decimals0,
        ),
      positionState.position.tokensOwed0.toString(),
    ),
    token1Amount: CurrencyAmount.fromRawAmount(
      token1 ??
        new Token(
          chainId,
          positionState.position.token1,
          positionState.decimals1,
        ),
      positionState.position.tokensOwed1.toString(),
    ),
  };
}

export async function viewCollectableTokenAmounts(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionId: bigint,
  publicClient?: PublicClient,
  blockNumber?: bigint,
): Promise<CollectableTokenAmounts> {
  const positionState = await viem.getPositionDetails(
    amm,
    getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
    positionId,
    publicClient ?? getPublicClient(chainId),
    blockNumber,
  );
  const [token0, token1] = await Promise.all([
    getToken(
      positionState.position.token0,
      chainId,
      publicClient,
      blockNumber,
      /* showSymbolAndName= */ true,
    ),
    getToken(
      positionState.position.token1,
      chainId,
      publicClient,
      blockNumber,
      /* showSymbolAndName= */ true,
    ),
  ]);
  return viewCollectableTokenAmountsFromPositionStateStruct(
    chainId,
    positionState,
    token0,
    token1,
  );
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
    undefined,
    position.pool.tickSpacing,
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
    /* increaseLiquidityParams= */ {
      tokenId: positionId,
      amount0Desired: 0n, // Not used in reinvest.
      amount1Desired: 0n, // Not used in reinvest.
      amount0Min: 0n,
      amount1Min: 0n,
      deadline: BigInt(Math.round(new Date().getTime() / 1000 + 60 * 10)), // 10 minutes from now.
    },
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
