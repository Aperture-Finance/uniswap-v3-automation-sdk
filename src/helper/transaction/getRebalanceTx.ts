import {
  ApertureSupportedChainId,
  INonfungiblePositionManager,
  IUniV3Automan__factory,
  PermitInfo,
  getChainInfo,
} from '@/index';
import {
  JsonRpcProvider,
  Provider,
  TransactionRequest,
} from '@ethersproject/providers';
import { CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { ADDRESS_ZERO, Pool, Position } from '@uniswap/v3-sdk';
import { BigNumber, BigNumberish } from 'ethers';

import { optimalMint } from '../aggregator';
import {
  AutomanFragment,
  getAutomanRebalanceCallInfo,
  simulateRemoveLiquidity,
} from '../automan';
import { PositionDetails } from '../position';
import { SimulatedAmounts } from './transaction';

/**
 * Generates an unsigned transaction that rebalances an existing position into a new one with the specified price range using Aperture's Automan contract.
 * @param chainId Chain id.
 * @param ownerAddress Owner of the existing position.
 * @param existingPositionId Existing position token id.
 * @param newPositionTickLower The lower tick of the new position.
 * @param newPositionTickUpper The upper tick of the new position.
 * @param slippageTolerance How much the amount of either token0 or token1 in the new position is allowed to change unfavorably.
 * @param deadlineEpochSeconds Timestamp when the tx expires (in seconds since epoch).
 * @param provider Ethers provider.
 * @param position Optional, the existing position.
 * @param permitInfo Optional. If Automan doesn't already have authority over the existing position, this should be populated with valid owner-signed permit info.
 * @param use1inch Optional. If set to true, the 1inch aggregator will be used to facilitate the swap.
 * @returns The generated transaction request and expected amounts.
 */

export async function getRebalanceTx(
  chainId: ApertureSupportedChainId,
  ownerAddress: string,
  existingPositionId: BigNumberish,
  newPositionTickLower: number,
  newPositionTickUpper: number,
  slippageTolerance: Percent,
  deadlineEpochSeconds: BigNumberish,
  provider: JsonRpcProvider | Provider,
  position?: Position,
  permitInfo?: PermitInfo,
  use1inch?: boolean,
): Promise<{
  tx: TransactionRequest;
  amounts: SimulatedAmounts;
}> {
  if (position === undefined) {
    ({ position } = await PositionDetails.fromPositionId(
      chainId,
      existingPositionId,
      provider,
    ));
  }
  let swapData = '0x';
  if (use1inch) {
    try {
      const { amount0: receive0, amount1: receive1 } =
        await simulateRemoveLiquidity(
          chainId,
          provider,
          ownerAddress,
          ownerAddress,
          existingPositionId,
          0,
          0,
          0,
        );
      ({ swapData } = await optimalMint(
        chainId,
        CurrencyAmount.fromRawAmount(position.pool.token0, receive0.toString()),
        CurrencyAmount.fromRawAmount(position.pool.token1, receive1.toString()),
        position.pool.fee,
        newPositionTickLower,
        newPositionTickUpper,
        ownerAddress,
        Number(slippageTolerance.numerator.toString()) /
          Number(slippageTolerance.denominator.toString()),
        provider,
      ));
    } catch (err) {
      console.warn(
        `Failed to construct 1inch swap data: ${err}. Will proceed with same-pool swap.`,
      );
    }
  }
  const mintParams: INonfungiblePositionManager.MintParamsStruct = {
    token0: position.pool.token0.address,
    token1: position.pool.token1.address,
    fee: position.pool.fee,
    tickLower: newPositionTickLower,
    tickUpper: newPositionTickUpper,
    amount0Desired: 0, // Param value ignored by Automan.
    amount1Desired: 0, // Param value ignored by Automan.
    amount0Min: 0, // Setting this to zero for tx simulation.
    amount1Min: 0, // Setting this to zero for tx simulation.
    recipient: ADDRESS_ZERO, // Param value ignored by Automan.
    deadline: deadlineEpochSeconds,
  };
  const { aperture_uniswap_v3_automan } = getChainInfo(chainId);
  const { functionFragment, data } = getAutomanRebalanceCallInfo(
    mintParams,
    existingPositionId,
    0,
    permitInfo,
    swapData,
  );
  const amounts = await getAmountsWithSlippage(
    position.pool,
    newPositionTickLower,
    newPositionTickUpper,
    aperture_uniswap_v3_automan,
    ownerAddress,
    functionFragment,
    data,
    slippageTolerance,
    provider,
  );
  mintParams.amount0Min = amounts.amount0Min;
  mintParams.amount1Min = amounts.amount1Min;
  return {
    tx: {
      from: ownerAddress,
      to: aperture_uniswap_v3_automan,
      data: getAutomanRebalanceCallInfo(
        mintParams,
        existingPositionId,
        0,
        permitInfo,
        swapData,
      ).data,
    },
    amounts,
  };
}

async function getAmountsWithSlippage(
  pool: Pool,
  tickLower: number,
  tickUpper: number,
  automanAddress: string,
  ownerAddress: string,
  functionFragment: AutomanFragment,
  data: string,
  slippageTolerance: Percent,
  provider: Provider,
): Promise<SimulatedAmounts> {
  const returnData = await provider.call({
    from: ownerAddress,
    to: automanAddress,
    data,
  });
  const { amount0, amount1, liquidity } =
    IUniV3Automan__factory.createInterface().decodeFunctionResult(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      functionFragment,
      returnData,
    ) as unknown as {
      amount0: BigNumber;
      amount1: BigNumber;
      liquidity: BigNumber;
    };
  const { amount0: amount0Min, amount1: amount1Min } = new Position({
    pool,
    liquidity: liquidity.toString(),
    tickLower,
    tickUpper,
  }).mintAmountsWithSlippage(slippageTolerance);
  return {
    amount0,
    amount1,
    amount0Min: amount0Min.toString(),
    amount1Min: amount1Min.toString(),
  };
}
