import {
  ApertureSupportedChainId,
  IUniswapV3Pool__factory,
  computePoolAddress,
} from '@/index';
import { Pool } from '@aperture_finance/uniswap-v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import {
  Address,
  GetContractReturnType,
  PublicClient,
  WalletClient,
  getContract,
} from 'viem';

import { getToken } from '../currency';
import { getPublicClient } from '../public_client';

/**
 * Constructs a Uniswap SDK Pool object for an existing and initialized pool.
 * Note that the constructed pool's `token0` and `token1` will be sorted, but the input `tokenA` and `tokenB` don't have to be.
 * @param tokenA One of the tokens in the pool.
 * @param tokenB The other token in the pool.
 * @param fee Fee tier of the pool.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param publicClient Viem public client.
 * @param blockNumber Optional block number to query.
 * @returns The constructed Uniswap SDK Pool object.
 */
export async function getPool(
  tokenA: Token | string,
  tokenB: Token | string,
  feeOrTickSpacing: number,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient?: PublicClient,
  blockNumber?: bigint,
): Promise<Pool> {
  publicClient = publicClient ?? getPublicClient(chainId);
  const poolContract = getPoolContract(
    tokenA,
    tokenB,
    feeOrTickSpacing,
    chainId,
    amm,
    publicClient,
  );
  const opts = { blockNumber };
  // If the specified pool has not been created yet, then the slot0() and liquidity() calls should fail (and throw an error).
  // Also update the tokens to the canonical type.
  const [slot0, inRangeLiquidity, tokenACanon, tokenBCanon] = await Promise.all(
    [
      poolContract.read.slot0(opts),
      poolContract.read.liquidity(opts),
      getToken(
        (typeof tokenA === 'string' ? tokenA : tokenA.address) as Address,
        chainId,
        publicClient,
        blockNumber,
      ),
      getToken(
        (typeof tokenB === 'string' ? tokenB : tokenB.address) as Address,
        chainId,
        publicClient,
        blockNumber,
      ),
    ],
  );
  let fee = feeOrTickSpacing;
  let tickSpacing: number | undefined = undefined;
  if (amm === AutomatedMarketMakerEnum.Enum.SLIPSTREAM) {
    fee = await poolContract.read.fee(opts);
    tickSpacing = feeOrTickSpacing;
  }

  const [sqrtPriceX96, tick] = slot0;
  if (sqrtPriceX96 === BigInt(0)) {
    throw 'Pool has been created but not yet initialized';
  }
  return new Pool(
    tokenACanon,
    tokenBCanon,
    fee,
    sqrtPriceX96.toString(),
    inRangeLiquidity.toString(),
    tick,
    undefined,
    tickSpacing,
  );
}

/**
 * Get the `IUniswapV3Pool` contract.
 */
export function getPoolContract(
  tokenA: Token | string,
  tokenB: Token | string,
  feeOrTickSpacing: number,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient?: PublicClient,
  walletClient?: WalletClient,
): GetContractReturnType<
  typeof IUniswapV3Pool__factory.abi,
  PublicClient | WalletClient
> {
  return getContract({
    address: computePoolAddress(chainId, amm, tokenA, tokenB, feeOrTickSpacing),
    abi: IUniswapV3Pool__factory.abi,
    client: walletClient ?? publicClient!,
  });
}
