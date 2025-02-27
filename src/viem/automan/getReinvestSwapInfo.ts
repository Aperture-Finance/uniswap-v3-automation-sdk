import { ApertureSupportedChainId } from '@/index';
import {
  E_Solver,
  PositionDetails,
  SolverResult,
  reinvestBackend,
  reinvestV3,
} from '@/viem';
import { IncreaseOptions } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, PublicClient } from 'viem';

/**
 * Calculates the SolverResults for reinvests on an existing position using Aperture's Automan contract.
 * Used for backend, so include gas fee reimbursement into feeBips then pass to solver.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param publicClient Viem public client.
 * @param from The address to reinvest from.
 * @param positionDetails The existing positionDetails
 * @param increaseOptions Options for increasing the position.
 * @param tokenPricesUsd The prices of the two tokens in the pool.
 * @param nativeToUsd The price of the native token in USD.
 * @param includeSolvers Optional. The solvers to include in the quote. If not provided, all solvers will be included.
 * @param blockNumber Optional. The block number to simulate the call from.
 */
export async function getReinvestSwapInfoBackend(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  positionDetails: PositionDetails,
  increaseOptions: IncreaseOptions,
  tokenPricesUsd: [string, string],
  nativeToUsd: string,
  includeSolvers?: E_Solver[],
  blockNumber?: bigint,
): Promise<SolverResult[]> {
  return reinvestBackend(
    chainId,
    amm,
    publicClient,
    from,
    positionDetails,
    increaseOptions,
    tokenPricesUsd,
    nativeToUsd,
    includeSolvers,
    blockNumber,
  );
}

/**
 * Calculates the SolverResults for reinvests on an existing position using Aperture's Automan contract.
 * Used for frontend.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param publicClient Viem public client.
 * @param from The address to reinvest from.
 * @param positionDetails The existing positionDetails
 * @param increaseOptions Options for increasing the position.
 * @param tokenPricesUsd The prices of the two tokens in the pool.
 * @param includeSolvers Optional. The solvers to include in the quote. If not provided, all solvers will be included.
 * @param blockNumber Optional. The block number to simulate the call from.
 */
export async function getReinvestSwapInfoV3(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  positionDetails: PositionDetails,
  increaseOptions: IncreaseOptions,
  tokenPricesUsd: [string, string],
  includeSolvers?: E_Solver[],
  blockNumber?: bigint,
): Promise<SolverResult[]> {
  if (positionDetails === undefined) {
    positionDetails = await PositionDetails.fromPositionId(
      chainId,
      amm,
      BigInt(increaseOptions.tokenId.toString()),
      publicClient,
      blockNumber,
    );
  }

  return reinvestV3(
    chainId,
    amm,
    publicClient,
    from,
    positionDetails,
    increaseOptions,
    tokenPricesUsd,
    includeSolvers,
    blockNumber,
  );
}
