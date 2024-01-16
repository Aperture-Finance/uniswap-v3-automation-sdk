import {
  ApertureSupportedChainId,
  IUniswapV3Pool__factory,
  getChainInfo,
} from '@/index';
import { Provider } from '@ethersproject/abstract-provider';
import { BlockTag } from '@ethersproject/providers';
import { Token } from '@uniswap/sdk-core';
import {
  FeeAmount,
  Pool,
  computePoolAddress as _computePoolAddress,
} from '@uniswap/v3-sdk';
import { Signer } from 'ethers';

import { getToken } from '../currency';
import { getPublicProvider } from '../provider';

/**
 * Constructs a Uniswap SDK Pool object for an existing and initialized pool.
 * Note that the constructed pool's `token0` and `token1` will be sorted, but the input `tokenA` and `tokenB` don't have to be.
 * @param tokenA One of the tokens in the pool.
 * @param tokenB The other token in the pool.
 * @param fee Fee tier of the pool.
 * @param chainId Chain id.
 * @param provider Ethers provider.
 * @param blockTag Optional block tag to query.
 * @returns The constructed Uniswap SDK Pool object.
 */
export async function getPool(
  tokenA: Token | string,
  tokenB: Token | string,
  fee: FeeAmount,
  chainId: ApertureSupportedChainId,
  provider?: Provider,
  blockTag?: BlockTag,
): Promise<Pool> {
  provider = provider ?? getPublicProvider(chainId);
  const poolContract = getPoolContract(tokenA, tokenB, fee, chainId, provider);
  const opts = { blockTag };
  // If the specified pool has not been created yet, then the slot0() and liquidity() calls should fail (and throw an error).
  // Also update the tokens to the canonical type.
  const [slot0, inRangeLiquidity, tokenACanon, tokenBCanon] = await Promise.all(
    [
      poolContract.slot0(opts),
      poolContract.liquidity(opts),
      getToken(
        typeof tokenA === 'string' ? tokenA : tokenA.address,
        chainId,
        provider,
        blockTag,
      ),
      getToken(
        typeof tokenB === 'string' ? tokenB : tokenB.address,
        chainId,
        provider,
        blockTag,
      ),
    ],
  );
  if (slot0.sqrtPriceX96.isZero()) {
    throw 'Pool has been created but not yet initialized';
  }
  return new Pool(
    tokenACanon,
    tokenBCanon,
    fee,
    slot0.sqrtPriceX96.toString(),
    inRangeLiquidity.toString(),
    slot0.tick,
  );
}

/**
 * Get the `IUniswapV3Pool` contract.
 */
export function getPoolContract(
  tokenA: Token | string,
  tokenB: Token | string,
  fee: FeeAmount,
  chainId: ApertureSupportedChainId,
  provider?: Provider | Signer,
) {
  return IUniswapV3Pool__factory.connect(
    computePoolAddress(
      getChainInfo(chainId).uniswap_v3_factory,
      tokenA,
      tokenB,
      fee,
    ),
    provider ?? getPublicProvider(chainId),
  );
}

/**
 * Computes a pool address
 * @param factoryAddress The Uniswap V3 factory address
 * @param token0 The first token of the pair, irrespective of sort order
 * @param token1 The second token of the pair, irrespective of sort order
 * @param fee The fee tier of the pool
 * @returns The pool address
 */
export function computePoolAddress(
  factoryAddress: string,
  token0: Token | string,
  token1: Token | string,
  fee: FeeAmount,
): string {
  return _computePoolAddress({
    factoryAddress,
    tokenA: new Token(
      1,
      typeof token0 === 'string' ? token0 : token0.address,
      18,
    ),
    tokenB: new Token(
      1,
      typeof token1 === 'string' ? token1 : token1.address,
      18,
    ),
    fee,
  });
}
