import {
  AutomanV3__factory,
  Automan__factory,
  ISlipStreamAutomanV3__factory,
  ISlipStreamAutoman__factory,
  PermitInfo,
} from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Hex, encodeFunctionData, hexToSignature } from 'viem';

import {
  DecreaseLiquidityParams,
  IncreaseLiquidityParams,
  SlipStreamMintParams,
  UniV3MintParams,
} from './types';

export function getAutomanMintOptimalCalldata(
  amm: AutomatedMarketMakerEnum,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  swapData: Hex = '0x',
): Hex {
  if (amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
    return encodeFunctionData({
      abi: ISlipStreamAutoman__factory.abi,
      args: [mintParams as SlipStreamMintParams, swapData] as const,
      functionName: 'mintOptimal',
    });
  }
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [mintParams as UniV3MintParams, swapData] as const,
    functionName: 'mintOptimal',
  });
}

export function getAutomanV3MintOptimalCalldata(
  amm: AutomatedMarketMakerEnum,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  swapData: Hex = '0x',
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
): Hex {
  if (amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
    return encodeFunctionData({
      abi: ISlipStreamAutomanV3__factory.abi,
      args: [
        mintParams as SlipStreamMintParams,
        swapData,
        token0FeeAmount,
        token1FeeAmount,
      ] as const,
      functionName: 'mintOptimal',
    });
  }
  return encodeFunctionData({
    abi: AutomanV3__factory.abi,
    args: [
      mintParams as UniV3MintParams,
      swapData,
      token0FeeAmount,
      token1FeeAmount,
    ] as const,
    functionName: 'mintOptimal',
  });
}

export function getAutomanIncreaseLiquidityOptimalCallData(
  increaseLiquidityParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
): Hex {
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [increaseLiquidityParams, swapData] as const,
    functionName: 'increaseLiquidityOptimal',
  });
}

export function getAutomanV3IncreaseLiquidityOptimalCallData(
  increaseLiquidityParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
): Hex {
  return encodeFunctionData({
    abi: AutomanV3__factory.abi,
    args: [
      increaseLiquidityParams,
      swapData,
      token0FeeAmount,
      token1FeeAmount,
    ] as const,
    functionName: 'increaseLiquidityOptimal',
  });
}

export function getAutomanDecreaseLiquidityCalldata(
  tokenId: bigint,
  liquidity: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  feeBips = BigInt(0),
  permitInfo?: PermitInfo,
): Hex {
  const decreaseLiquidityParams: DecreaseLiquidityParams = {
    tokenId,
    liquidity,
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: Automan__factory.abi,
      args: [decreaseLiquidityParams, feeBips] as const,
      functionName: 'decreaseLiquidity',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [
      decreaseLiquidityParams,
      feeBips,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'decreaseLiquidity',
  });
}

export function getAutomanV3DecreaseLiquidityCalldata(
  tokenId: bigint,
  liquidity: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  permitInfo?: PermitInfo,
): Hex {
  const params: DecreaseLiquidityParams = {
    tokenId,
    liquidity,
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: AutomanV3__factory.abi,
      args: [params, token0FeeAmount, token1FeeAmount] as const,
      functionName: 'decreaseLiquidity',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: AutomanV3__factory.abi,
    args: [
      params,
      token0FeeAmount,
      token1FeeAmount,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'decreaseLiquidity',
  });
}

export function getAutomanRebalanceCalldata(
  amm: AutomatedMarketMakerEnum,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  tokenId: bigint,
  feeBips = BigInt(0),
  swapData: Hex = '0x',
  permitInfo?: PermitInfo,
): Hex {
  if (permitInfo === undefined) {
    if (amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
      return encodeFunctionData({
        abi: ISlipStreamAutoman__factory.abi,
        args: [
          mintParams as SlipStreamMintParams,
          tokenId,
          feeBips,
          swapData,
        ] as const,
        functionName: 'rebalance',
      });
    }
    return encodeFunctionData({
      abi: Automan__factory.abi,
      args: [
        mintParams as UniV3MintParams,
        tokenId,
        feeBips,
        swapData,
      ] as const,
      functionName: 'rebalance',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  if (amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
    return encodeFunctionData({
      abi: ISlipStreamAutoman__factory.abi,
      args: [
        mintParams as SlipStreamMintParams,
        tokenId,
        feeBips,
        swapData,
        BigInt(permitInfo.deadline),
        Number(v),
        r,
        s,
      ] as const,
      functionName: 'rebalance',
    });
  }
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [
      mintParams as UniV3MintParams,
      tokenId,
      feeBips,
      swapData,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'rebalance',
  });
}

export function getAutomanV3RebalanceCalldata(
  amm: AutomatedMarketMakerEnum,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  tokenId: bigint,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  swapData: Hex = '0x',
  permitInfo?: PermitInfo,
): Hex {
  if (permitInfo === undefined) {
    if (amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
      return encodeFunctionData({
        abi: ISlipStreamAutomanV3__factory.abi,
        args: [
          mintParams as SlipStreamMintParams,
          tokenId,
          token0FeeAmount,
          token1FeeAmount,
          swapData,
        ] as const,
        functionName: 'rebalance',
      });
    }
    return encodeFunctionData({
      abi: AutomanV3__factory.abi,
      args: [
        mintParams as UniV3MintParams,
        tokenId,
        token0FeeAmount,
        token1FeeAmount,
        swapData,
      ] as const,
      functionName: 'rebalance',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  if (amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
    return encodeFunctionData({
      abi: ISlipStreamAutomanV3__factory.abi,
      args: [
        mintParams as SlipStreamMintParams,
        tokenId,
        token0FeeAmount,
        token1FeeAmount,
        swapData,
        BigInt(permitInfo.deadline),
        Number(v),
        r,
        s,
      ] as const,
      functionName: 'rebalance',
    });
  }
  return encodeFunctionData({
    abi: AutomanV3__factory.abi,
    args: [
      mintParams as UniV3MintParams,
      tokenId,
      token0FeeAmount,
      token1FeeAmount,
      swapData,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'rebalance',
  });
}

export function getAutomanReinvestCalldata(
  increaseLiquidityParams: IncreaseLiquidityParams,
  feeBips = BigInt(0),
  swapData: Hex = '0x',
  permitInfo?: PermitInfo,
): Hex {
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: Automan__factory.abi,
      args: [increaseLiquidityParams, feeBips, swapData] as const,
      functionName: 'reinvest',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [
      increaseLiquidityParams,
      feeBips,
      swapData,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'reinvest',
  });
}

export function getAutomanV3ReinvestCalldata(
  increaseLiquidityParams: IncreaseLiquidityParams,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  swapData: Hex = '0x',
  permitInfo?: PermitInfo,
): Hex {
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: AutomanV3__factory.abi,
      args: [
        increaseLiquidityParams,
        token0FeeAmount,
        token1FeeAmount,
        swapData,
      ] as const,
      functionName: 'reinvest',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: AutomanV3__factory.abi,
    args: [
      increaseLiquidityParams,
      token0FeeAmount,
      token1FeeAmount,
      swapData,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'reinvest',
  });
}

export function getAutomanRemoveLiquidityCalldata(
  tokenId: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  feeBips = BigInt(0),
  permitInfo?: PermitInfo,
): Hex {
  const params: DecreaseLiquidityParams = {
    tokenId,
    liquidity: BigInt(0), // Param value ignored by Automan.
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: Automan__factory.abi,
      args: [params, feeBips] as const,
      functionName: 'removeLiquidity',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [
      params,
      feeBips,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'removeLiquidity',
  });
}

export function getAutomanV3RemoveLiquidityCalldata(
  tokenId: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  permitInfo?: PermitInfo,
): Hex {
  const params: DecreaseLiquidityParams = {
    tokenId,
    liquidity: BigInt(0), // Param value ignored by Automan.
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: AutomanV3__factory.abi,
      args: [params, token0FeeAmount, token1FeeAmount] as const,
      functionName: 'removeLiquidity',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: AutomanV3__factory.abi,
    args: [
      params,
      token0FeeAmount,
      token1FeeAmount,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'removeLiquidity',
  });
}
