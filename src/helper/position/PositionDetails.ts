import { ApertureSupportedChainId, getChainInfoAMM } from '@/index';
import { BlockTag, Provider } from '@ethersproject/providers';
import { BigintIsh, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { FeeAmount, Pool, Position, PositionLibrary } from '@uniswap/v3-sdk';
import { EphemeralGetPosition__factory } from 'aperture-lens';
import { PositionStateStructOutput } from 'aperture-lens/dist/typechain/contracts/EphemeralGetPosition';
import { BigNumber, BigNumberish } from 'ethers';
import JSBI from 'jsbi';

import { getPoolContract } from '../pool';
import { getBasicPositionInfo } from './index';
import { getNPM } from './position';
import { BasicPositionInfo, CollectableTokenAmounts } from './types';

/**
 * Contains the full position details including the corresponding pool and real-time collectable token amounts.
 */
export class PositionDetails implements BasicPositionInfo {
  public readonly tokenId: string;
  public readonly owner: string;
  public readonly token0: Token;
  public readonly token1: Token;
  public readonly fee: FeeAmount;
  public readonly liquidity: string;
  public readonly tickLower: number;
  public readonly tickUpper: number;
  public readonly pool: Pool;
  public readonly position: Position;
  private readonly _tokensOwed0: BigNumber;
  private readonly _tokensOwed1: BigNumber;

  private constructor(
    tokenId: BigNumberish,
    owner: string,
    basicPositionInfo: BasicPositionInfo,
    sqrtRatioX96: BigintIsh,
    tick: number,
    activeLiquidity: BigintIsh,
    tokensOwed0: BigNumber,
    tokensOwed1: BigNumber,
  ) {
    this.tokenId = tokenId.toString();
    this.owner = owner;
    this.token0 = basicPositionInfo.token0;
    this.token1 = basicPositionInfo.token1;
    this.fee = basicPositionInfo.fee;
    this.liquidity = basicPositionInfo.liquidity!.toString();
    this.tickLower = basicPositionInfo.tickLower;
    this.tickUpper = basicPositionInfo.tickUpper;
    this.pool = new Pool(
      this.token0,
      this.token1,
      this.fee,
      sqrtRatioX96.toString(),
      activeLiquidity.toString(),
      tick,
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
   * @param positionId Position id.
   * @param provider Ethers provider.
   * @returns The position details.
   */
  public static async fromPositionId(
    chainId: ApertureSupportedChainId,
    positionId: BigNumberish,
    provider: Provider,
    blockTag?: BlockTag,
  ): Promise<PositionDetails> {
    const returnData = await provider.call(
      new EphemeralGetPosition__factory().getDeployTransaction(
        getChainInfoAMM(chainId).ammToInfo.get('UNISWAP')?.nonfungiblePositionManager!,
        positionId,
      ),
      blockTag,
    );
    return PositionDetails.fromPositionStateStruct(
      chainId,
      EphemeralGetPosition__factory.createInterface().decodeFunctionResult(
        'getPosition',
        returnData,
      )[0],
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
      slot0,
      activeLiquidity,
      decimals0,
      decimals1,
    }: PositionStateStructOutput,
  ): PositionDetails {
    return new PositionDetails(
      tokenId,
      owner,
      {
        token0: new Token(chainId, position.token0, decimals0),
        token1: new Token(chainId, position.token1, decimals1),
        fee: position.fee,
        liquidity: position.liquidity.toString(),
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
      },
      slot0.sqrtPriceX96.toString(),
      slot0.tick,
      activeLiquidity.toString(),
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
   * @param provider Ethers provider.
   */
  public async getCollectableTokenAmounts(
    provider: Provider,
  ): Promise<CollectableTokenAmounts> {
    return viewCollectableTokenAmounts(this.chainId, this.tokenId, provider, {
      token0: this.token0,
      token1: this.token1,
      fee: this.fee,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
      liquidity: this.liquidity,
    });
  }
}

/**
 * View the amount of collectable tokens in a position without specifying the owner as `from` which isn't multicallable.
 * The collectable amount is most likely accrued fees accumulated in the position, but can be from a prior decreaseLiquidity() call which has not been collected.
 * @param chainId Chain id.
 * @param positionId Position id.
 * @param provider Ethers provider.
 * @param basicPositionInfo Basic position info, optional.
 * @returns A promise that resolves to collectable amount of the two tokens in the position.
 */
export async function viewCollectableTokenAmounts(
  chainId: ApertureSupportedChainId,
  positionId: BigNumberish,
  provider: Provider,
  basicPositionInfo?: BasicPositionInfo,
  blockTag?: BlockTag,
): Promise<CollectableTokenAmounts> {
  if (basicPositionInfo === undefined) {
    basicPositionInfo = await getBasicPositionInfo(
      chainId,
      positionId,
      provider,
      blockTag,
    );
  }
  const pool = getPoolContract(
    basicPositionInfo.token0,
    basicPositionInfo.token1,
    basicPositionInfo.fee,
    chainId,
    provider,
  );
  const overrides = { blockTag };
  const [
    slot0,
    feeGrowthGlobal0X128,
    feeGrowthGlobal1X128,
    lower,
    upper,
    position,
  ] = await Promise.all([
    pool.slot0(overrides),
    pool.feeGrowthGlobal0X128(overrides),
    pool.feeGrowthGlobal1X128(overrides),
    pool.ticks(basicPositionInfo.tickLower, overrides),
    pool.ticks(basicPositionInfo.tickUpper, overrides),
    getNPM(chainId, provider).positions(positionId, overrides),
  ]);

  // https://github.com/Uniswap/v4-core/blob/f630c8ca8c669509d958353200953762fd15761a/contracts/libraries/Pool.sol#L566
  let feeGrowthInside0X128: BigNumber, feeGrowthInside1X128: BigNumber;
  if (slot0.tick < basicPositionInfo.tickLower) {
    feeGrowthInside0X128 = lower.feeGrowthOutside0X128.sub(
      upper.feeGrowthOutside0X128,
    );
    feeGrowthInside1X128 = lower.feeGrowthOutside1X128.sub(
      upper.feeGrowthOutside1X128,
    );
  } else if (slot0.tick >= basicPositionInfo.tickUpper) {
    feeGrowthInside0X128 = upper.feeGrowthOutside0X128.sub(
      lower.feeGrowthOutside0X128,
    );
    feeGrowthInside1X128 = upper.feeGrowthOutside1X128.sub(
      lower.feeGrowthOutside1X128,
    );
  } else {
    feeGrowthInside0X128 = feeGrowthGlobal0X128
      .sub(lower.feeGrowthOutside0X128)
      .sub(upper.feeGrowthOutside0X128);
    feeGrowthInside1X128 = feeGrowthGlobal1X128
      .sub(lower.feeGrowthOutside1X128)
      .sub(upper.feeGrowthOutside1X128);
  }
  const [tokensOwed0, tokensOwed1] = PositionLibrary.getTokensOwed(
    JSBI.BigInt(position.feeGrowthInside0LastX128.toString()),
    JSBI.BigInt(position.feeGrowthInside1LastX128.toString()),
    JSBI.BigInt(position.liquidity.toString()),
    JSBI.BigInt(feeGrowthInside0X128.toString()),
    JSBI.BigInt(feeGrowthInside1X128.toString()),
  );
  return {
    token0Amount: CurrencyAmount.fromRawAmount(
      basicPositionInfo.token0,
      position.tokensOwed0.add(tokensOwed0.toString()).toString(),
    ),
    token1Amount: CurrencyAmount.fromRawAmount(
      basicPositionInfo.token1,
      position.tokensOwed1.add(tokensOwed1.toString()).toString(),
    ),
  };
}
