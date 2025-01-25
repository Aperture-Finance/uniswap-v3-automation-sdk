import {
  AutomanV4__factory,
  Automan__factory,
  ISlipStreamAutomanV4__factory,
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

export function getAutomanV4MintOptimalCalldata(
  amm: AutomatedMarketMakerEnum,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  swapData: Hex = '0x',
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
): Hex {
  if (amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
    return encodeFunctionData({
      abi: ISlipStreamAutomanV4__factory.abi,
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
    abi: AutomanV4__factory.abi,
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
  increaseParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
): Hex {
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [increaseParams, swapData] as const,
    functionName: 'increaseLiquidityOptimal',
  });
}

export function getAutomanV4IncreaseLiquidityOptimalCallData(
  increaseParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
): Hex {
  return encodeFunctionData({
    abi: AutomanV4__factory.abi,
    args: [increaseParams, swapData, token0FeeAmount, token1FeeAmount] as const,
    functionName: 'increaseLiquidityOptimal',
  });
}

// Still used by backend for Prescheduled Position Close
export function getAutomanDecreaseLiquidityCalldata(
  decreaseLiquidityParams: DecreaseLiquidityParams,
  feeBips = BigInt(0),
  permitInfo?: PermitInfo,
): Hex {
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

export function getAutomanV4DecreaseLiquidityCalldata(
  decreaseLiquidityParams: DecreaseLiquidityParams,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  isUnwrapNative = true,
  permitInfo?: PermitInfo,
): Hex {
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: AutomanV4__factory.abi,
      args: [
        decreaseLiquidityParams,
        token0FeeAmount,
        token1FeeAmount,
        isUnwrapNative,
      ] as const,
      functionName: 'decreaseLiquidity',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: AutomanV4__factory.abi,
    args: [
      decreaseLiquidityParams,
      token0FeeAmount,
      token1FeeAmount,
      isUnwrapNative,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'decreaseLiquidity',
  });
}

export function getAutomanDecreaseLiquiditySingleCalldata(
  decreaseLiquidityParams: DecreaseLiquidityParams,
  zeroForOne: boolean,
  token0FeeAmount: bigint,
  token1FeeAmount: bigint,
  swapData: Hex = '0x',
  isUnwrapNative = true,
  permitInfo?: PermitInfo,
): Hex {
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: AutomanV4__factory.abi,
      args: [
        decreaseLiquidityParams,
        zeroForOne,
        token0FeeAmount,
        token1FeeAmount,
        swapData,
        isUnwrapNative,
      ] as const,
      functionName: 'decreaseLiquiditySingle',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: AutomanV4__factory.abi,
    args: [
      decreaseLiquidityParams,
      zeroForOne,
      token0FeeAmount,
      token1FeeAmount,
      swapData,
      isUnwrapNative,
      BigInt(permitInfo.deadline),
      Number(v),
      r,
      s,
    ] as const,
    functionName: 'decreaseLiquiditySingle',
  });
}

export function getAutomanRebalanceCalldata(
  amm: AutomatedMarketMakerEnum,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  tokenId: bigint,
  feeBips = BigInt(0),
  permitInfo?: PermitInfo,
  swapData: Hex = '0x',
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

export function getAutomanV4RebalanceCalldata(
  amm: AutomatedMarketMakerEnum,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  tokenId: bigint,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  permitInfo?: PermitInfo,
  swapData: Hex = '0x',
): Hex {
  if (permitInfo === undefined) {
    if (amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
      return encodeFunctionData({
        abi: ISlipStreamAutomanV4__factory.abi,
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
      abi: AutomanV4__factory.abi,
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
      abi: ISlipStreamAutomanV4__factory.abi,
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
    abi: AutomanV4__factory.abi,
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
  tokenId: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  feeBips = BigInt(0),
  permitInfo?: PermitInfo,
  swapData: Hex = '0x',
): Hex {
  const params: IncreaseLiquidityParams = {
    tokenId,
    amount0Desired: BigInt(0), // Param value ignored by Automan.
    amount1Desired: BigInt(0), // Param value ignored by Automan.
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: Automan__factory.abi,
      args: [params, feeBips, swapData] as const,
      functionName: 'reinvest',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: Automan__factory.abi,
    args: [
      params,
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

export function getAutomanV4ReinvestCalldata(
  tokenId: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  permitInfo?: PermitInfo,
  swapData: Hex = '0x',
): Hex {
  const params: IncreaseLiquidityParams = {
    tokenId,
    amount0Desired: BigInt(0), // Param value ignored by Automan.
    amount1Desired: BigInt(0), // Param value ignored by Automan.
    amount0Min,
    amount1Min,
    deadline,
  };
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: AutomanV4__factory.abi,
      args: [params, token0FeeAmount, token1FeeAmount, swapData] as const,
      functionName: 'reinvest',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  return encodeFunctionData({
    abi: AutomanV4__factory.abi,
    args: [
      params,
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

// Uses AutomanV1 for backend.
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
