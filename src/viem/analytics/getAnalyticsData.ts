import { ApertureSupportedChainId } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import axios from 'axios';

export type AnalyticPositionSubgraphData = {
  id: string;
  tokenId: bigint;
  tickLower: number;
  tickUpper: number;
  poolAddress: string;

  liquidity: bigint;
  investedToken0Amount: bigint;
  investedToken1Amount: bigint;
  withdrawnToken0Amount: bigint;
  withdrawnToken1Amount: bigint;
  collectedToken0Amount: bigint;
  collectedToken1Amount: bigint;
  reinvestedToken0Amount: bigint;
  reinvestedToken1Amount: bigint;
  gasCost: bigint;

  createdTimestamp: bigint;
  closedTimestamp?: bigint;
  closedMarketPrice?: bigint;
  closedToken0USDPrice?: number;
  closedToken1USDPrice?: number;
  closedNativeUSDPrice?: number;
  activityLogs: string[];

  headPosition: {
    id: string;
    rebalancePositions: {
      id: string;
      closedTimestamp?: bigint;
    }[];
  };
};

/**
 * Fetches position analytics data for the specified address.
 * @param amm Automated Market Maker.
 * @param chainId Chain id.
 * @param walletAddress The wallet address to fetch analytics data for.
 * @param skip Subgraph can fetch max 1000 result in a batch, so we should skip the offset when query.
 */
export async function getPositionAnalytics(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  walletAddress: string,
  skip: number,
  subgraphUrl: string, // TODO: add the subgraph URL to chain info
) {
  // const subgraphUrl = getAMMInfo(
  //   chainId,
  //   amm,
  // )?.analytics_subgraph_url;
  // if (subgraphUrl === undefined) {
  //   throw 'Analytics subgraph URL is not defined for the specified chain id and amm';
  // }

  if (
    amm !== 'UNISWAP_V3' &&
    chainId !== ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID
  )
    return [];

  const analyticPositionSubgraph: AnalyticPositionSubgraphData[] | undefined = (
    await axios.post(subgraphUrl, {
      operationName: 'AnalyticPosition',
      variables: {
        account: walletAddress.toLowerCase(),
        skip,
      },
      query: `
        query AnalyticPosition($account: String!, $skip: Int!) {
          positions(first: 1000, skip: $skip, where: {owner: $account}) {
            id
            tokenId
            poolAddress
            tickLower
            tickUpper

            liquidity
            investedToken0Amount
            investedToken1Amount
            withdrawnToken0Amount
            withdrawnToken1Amount
            collectedToken0Amount
            collectedToken1Amount
            reinvestedToken0Amount
            reinvestedToken1Amount
            gasCost

            createdTimestamp
            closedTimestamp
            closedMarketPrice
            closedToken0USDPrice
            closedToken1USDPrice
            closedNativeUSDPrice
            activityLogs

            headPosition {
              id
              rebalancePositions {
                id
                closedTimestamp
              }
            }
          }
        }
      `,
    })
  ).data.data?.positions;
  return analyticPositionSubgraph;
}
