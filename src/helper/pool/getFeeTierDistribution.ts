import { FeeTierDistributionQuery } from '@/data/__graphql_generated__/uniswap-thegraph-types-and-hooks';
import { ApertureSupportedChainId, getChainInfoAMM } from '@/index';
import { FeeAmount } from '@uniswap/v3-sdk';
import axios from 'axios';

/**
 * Fetches the TVL distribution of the different fee tiers behind the specified token pair.
 * Implementation heavily adapted from https://github.com/Uniswap/interface/blob/bd4042aa16cbd035f4b543272ef9ae301c96e8c9/src/hooks/useFeeTierDistribution.ts#L76.
 * @param chainId Chain id.
 * @param tokenA Address of one of the tokens in the pool.
 * @param tokenB Address of the other token in the pool.
 * @returns A record with four entries where the keys are the fee tiers and the values are the TVL fractions with the corresponding fee tiers.
 */
export async function getFeeTierDistribution(
  chainId: ApertureSupportedChainId,
  tokenA: string,
  tokenB: string,
): Promise<Record<FeeAmount, number>> {
  const { uniswap_subgraph_url } = getChainInfoAMM(chainId);
  if (uniswap_subgraph_url === undefined) {
    throw 'Subgraph URL is not defined for the specified chain id';
  }
  const [token0, token1] = [tokenA.toLowerCase(), tokenB.toLowerCase()].sort();
  const feeTierTotalValueLocked: FeeTierDistributionQuery = (
    await axios.post(uniswap_subgraph_url, {
      operationName: 'FeeTierDistribution',
      variables: {
        token0,
        token1,
      },
      query: `
          query FeeTierDistribution($token0: String!, $token1: String!) {
            _meta {
              block {
                number
              }
            }
            feeTierTVL: pools(
              orderBy: totalValueLockedToken0
              orderDirection: desc
              where: { token0: $token0, token1: $token1 }
            ) {
              feeTier
              totalValueLockedToken0
              totalValueLockedToken1
            }
          }`,
    })
  ).data.data;
  const feeTierToTVL = new Map<FeeAmount, number>();
  let sumTVL = 0;
  for (const feeTierTVL of feeTierTotalValueLocked.feeTierTVL) {
    const feeAmount = Number(feeTierTVL.feeTier) as FeeAmount;
    if (!(feeAmount in FeeAmount)) continue;
    const token0TVL = Number(feeTierTVL.totalValueLockedToken0 ?? 0);
    const token1TVL = Number(feeTierTVL.totalValueLockedToken1 ?? 0);
    feeTierToTVL.set(feeAmount, token0TVL + token1TVL);
    sumTVL += token0TVL + token1TVL;
  }
  const getFeeTierFraction = (feeAmount: FeeAmount): number => {
    return (feeTierToTVL.get(feeAmount) ?? 0) / sumTVL;
  };
  return {
    [FeeAmount.LOWEST]: getFeeTierFraction(FeeAmount.LOWEST),
    [FeeAmount.LOW]: getFeeTierFraction(FeeAmount.LOW),
    [FeeAmount.MEDIUM]: getFeeTierFraction(FeeAmount.MEDIUM),
    [FeeAmount.HIGH]: getFeeTierFraction(FeeAmount.HIGH),
  };
}
