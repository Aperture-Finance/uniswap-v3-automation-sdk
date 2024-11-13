import { ApertureSupportedChainId } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import axios from 'axios';
import { Address } from 'viem';

export type AnalyticPositionSubgraphData = {
  id: string;
  owner: Address;
  tokenId: bigint;
  poolAddress: Address;
  tickLower: number;
  tickUpper: number;

  liquidity: bigint;
  investedToken0Amount: bigint;
  investedToken1Amount: bigint;
  withdrawnToken0Amount: bigint;
  withdrawnToken1Amount: bigint;
  currentToken0Amount: bigint;
  currentToken1Amount: bigint;

  averageToken0Amount: bigint;
  averageToken1Amount: bigint;

  collectedToken0Amount: bigint;
  collectedToken1Amount: bigint;
  reinvestedToken0Amount: bigint;
  reinvestedToken1Amount: bigint;

  gasCost: bigint;
  createdTimestamp: bigint;
  updatedTimestamp: bigint;
  closedTimestamp?: bigint;
  closedMarketPrice?: bigint;

  headPosition: {
    id: string;
    rebalancePositions: {
      id: string;
      closedTimestamp?: bigint;
    }[];
  };
  activityLogs: string[];
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
) {
  // const analytics_subgraph_url = getAMMInfo(
  //   chainId,
  //   amm,
  // )?.analytics_subgraph_url;
  // if (analytics_subgraph_url === undefined) {
  //   throw 'Analytics subgraph URL is not defined for the specified chain id and amm';
  // }

  // TODO: change the subgraph to proper URL after final release
  const analytics_subgraph_url =
    'https://api.goldsky.com/api/public/project_clnz7akg41cv72ntv0uhyd3ai/subgraphs/jiaqi-subgraph-test/0.1.0/gn';
  if (
    amm !== 'UNISWAP_V3' &&
    chainId !== ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID
  )
    return [];

  const analyticPositionSubgraph: AnalyticPositionSubgraphData[] | undefined = (
    await axios.post(analytics_subgraph_url, {
      operationName: 'AnalyticPosition',
      variables: {
        account: walletAddress,
        skip,
      },
      query: `
          query AnalyticPosition($account: String!, $skip: Int!) {
            positions(first: 1000, skip: $skip, where: {owner: $account}) {
              id
              owner
              tokenId
              poolAddress
              tickLower
              tickUpper
              liquidity
              investedToken0Amount
              investedToken1Amount
              withdrawnToken0Amount
              withdrawnToken1Amount
              currentToken0Amount
              currentToken1Amount
              averageToken0Amount
              averageToken1Amount
              collectedToken0Amount
              collectedToken1Amount
              reinvestedToken0Amount
              reinvestedToken1Amount
              gasCost
              createdTimestamp
              updatedTimestamp
              closedTimestamp
              closedMarketPrice
              headPosition {
                id
                rebalancePositions {
                  id
                  closedTimestamp
                }
              }
              activityLogs
            }
          }
        `,
    })
  ).data.data?.positions;
  return analyticPositionSubgraph;
}
