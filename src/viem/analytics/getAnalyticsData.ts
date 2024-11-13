import axios from 'axios';
import { Address } from 'viem';

export type AnalyticPositionSubgraphData = {
  id: string;
  owner: Address;
  tokenId: bigint;
  poolAddress: Address;
  tickLower: number;
  tickUpper: number;

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
 * @param address The wallet address to fetch analytics data for.
 */
export async function getPositionAnalytics(address: string) {
  const analyticPositionSubgraph: AnalyticPositionSubgraphData[] | undefined = (
    await axios.post(
      // TODO: change the subgraph to proper URL after final release
      'https://api.goldsky.com/api/public/project_clnz7akg41cv72ntv0uhyd3ai/subgraphs/jiaqi-subgraph-test/0.1.0/gn',
      {
        operationName: 'AnalyticPosition',
        variables: {
          account: address,
        },
        query: `
            query AnalyticPosition($account: String!) {
              positions(where: {owner: $account}) {
                id
                owner
                tokenId
                poolAddress
                tickLower
                tickUpper
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
      },
    )
  ).data.data?.positions;
  return analyticPositionSubgraph;
}
