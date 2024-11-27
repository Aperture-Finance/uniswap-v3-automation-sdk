import { ApertureSupportedChainId } from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import axios from 'axios';

/**
 * Fetches position rebalance history data for the specified address.
 * @param amm Automated Market Maker.
 * @param chainId Chain id.
 * @param positionId The position id to fetch rebalance history data for.
 */
export async function getPositionRebalanceHistory(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  positionId: string,
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

  const analyticPositionSubgraph = (
    await axios.post(subgraphUrl, {
      operationName: 'PositionRebalanceHistory',
      variables: {
        tokenId: positionId,
      },
      query: `
        query PositionRebalanceHistory($tokenId: String!) {
          position(id: $tokenId) {
            id
            headPosition {
              rebalancePositions {
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
              }
            }
          }
        }
      `,
    })
  ).data.data?.position?.headPosition?.rebalancePositions;
  return analyticPositionSubgraph;
}
