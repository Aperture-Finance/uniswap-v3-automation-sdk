import { Token } from '@uniswap/sdk-core';

import { checkTokenLiquidityAgainstChainNativeCurrency } from '../currency';

/**
 * Checks whether the specified pool is supported by Aperture automation, i.e. pre-scheduled position close, rebalance, auto-compound, etc.
 * @param tokenA One of the tokens in the pool.
 * @param tokenB The other token in the pool.
 */
export async function checkAutomationSupportForPool(
  tokenA: Token,
  tokenB: Token,
): Promise<boolean> {
  const [quoteA, quoteB] = await Promise.all([
    checkTokenLiquidityAgainstChainNativeCurrency(
      tokenA.chainId,
      tokenA.address,
    ),
    checkTokenLiquidityAgainstChainNativeCurrency(
      tokenB.chainId,
      tokenB.address,
    ),
  ]);
  return quoteA !== '-1' && quoteB !== '-1';
}
