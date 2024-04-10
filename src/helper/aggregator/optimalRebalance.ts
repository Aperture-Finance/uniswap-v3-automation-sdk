import { ApertureSupportedChainId, INonfungiblePositionManager } from '@/index';
import { JsonRpcProvider, Provider } from '@ethersproject/providers';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BigNumberish } from 'ethers';

import { simulateRebalance, simulateRemoveLiquidity } from '../automan';
import { PositionDetails } from '../position';
import { getOptimalMintSwapData } from './internal';

export async function optimalRebalance(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  positionId: BigNumberish,
  newTickLower: number,
  newTickUpper: number,
  feeBips: BigNumberish,
  usePool: boolean,
  fromAddress: string,
  slippage: number,
  provider: JsonRpcProvider | Provider,
  blockNumber?: number,
) {
  const position = await PositionDetails.fromPositionId(
    chainId,
    amm,
    positionId,
    provider,
    blockNumber,
  );
  const { amount0: receive0, amount1: receive1 } =
    await simulateRemoveLiquidity(
      chainId,
      amm,
      provider,
      fromAddress,
      position.owner,
      position.tokenId,
      0,
      0,
      feeBips,
      blockNumber,
    );
  const mintParams: INonfungiblePositionManager.MintParamsStruct = {
    token0: position.token0.address,
    token1: position.token1.address,
    fee: position.fee,
    tickLower: newTickLower,
    tickUpper: newTickUpper,
    amount0Desired: receive0,
    amount1Desired: receive1,
    amount0Min: 0, // Setting this to zero for tx simulation.
    amount1Min: 0, // Setting this to zero for tx simulation.
    recipient: fromAddress, // Param value ignored by Automan for rebalance.
    deadline: Math.floor(Date.now() / 1000 + 86400),
  };
  let swapData = '0x';
  if (!usePool) {
    swapData = (
      await getOptimalMintSwapData(
        chainId,
        amm,
        provider,
        mintParams,
        slippage,
        blockNumber,
      )
    ).swapData;
  }
  const { amount0, amount1, liquidity } = await simulateRebalance(
    chainId,
    amm,
    provider,
    fromAddress,
    position.owner,
    mintParams,
    positionId,
    feeBips,
    swapData,
    blockNumber,
  );
  return {
    amount0,
    amount1,
    liquidity,
    swapData,
  };
}
