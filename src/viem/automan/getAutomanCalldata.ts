import {
  AutomanV4__factory,
  Automan__factory,
  ISlipStreamAutomanV4__factory,
  ISlipStreamAutoman__factory,
  NULL_ADDRESS,
  PermitInfo,
} from '@/index';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Hex, encodeFunctionData, hexToSignature } from 'viem';

import {
  DecreaseLiquidityParams,
  IncreaseLiquidityParams,
  PermitParams,
  SlipStreamMintParams,
  UniV3MintParams,
  ZapOutParams,
} from './types';

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

export function getAutomanMintFromTokenInCalldata(
  mintParams: UniV3MintParams | SlipStreamMintParams,
  tokenIn: Address,
  tokenInFeeAmount = BigInt(0),
  swapData0: Hex = '0x',
  swapData1: Hex = '0x',
): Hex {
  return encodeFunctionData({
    abi: AutomanV4__factory.abi,
    args: [
      mintParams as UniV3MintParams,
      tokenIn,
      tokenInFeeAmount,
      swapData0,
      swapData1,
    ] as const,
    functionName: 'mintFromTokenIn',
  });
}

export function getAutomanV4IncreaseLiquidityOptimalCalldata(
  increaseLiquidityParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
): Hex {
  return encodeFunctionData({
    abi: AutomanV4__factory.abi,
    args: [
      increaseLiquidityParams,
      swapData,
      token0FeeAmount,
      token1FeeAmount,
    ] as const,
    functionName: 'increaseLiquidityOptimal',
  });
}

export function getAutomanIncreaseLiquidityFromTokenInCalldata(
  increaseLiquidityParams: IncreaseLiquidityParams,
  tokenIn: Address,
  tokenInFeeAmount = BigInt(0),
  swapData0: Hex = '0x',
  swapData1: Hex = '0x',
): Hex {
  return encodeFunctionData({
    abi: AutomanV4__factory.abi,
    args: [
      increaseLiquidityParams,
      tokenIn,
      tokenInFeeAmount,
      swapData0,
      swapData1,
    ] as const,
    functionName: 'increaseLiquidityFromTokenIn',
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
  tokenOut: Address,
  tokenOutMin: bigint,
  token0FeeAmount: bigint,
  token1FeeAmount: bigint,
  swapData0: Hex = '0x',
  swapData1: Hex = '0x',
  isUnwrapNative = true,
  permitInfo?: PermitInfo,
): Hex {
  const zapOutParams: ZapOutParams = {
    token0FeeAmount,
    token1FeeAmount,
    tokenOut,
    tokenOutMin,
    swapData0,
    swapData1,
    isUnwrapNative,
  };
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: AutomanV4__factory.abi,
      args: [decreaseLiquidityParams, zapOutParams] as const,
      functionName: 'decreaseLiquidity',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  const permitParams: PermitParams = {
    deadline: BigInt(permitInfo.deadline),
    v: Number(v),
    r,
    s,
  };
  return encodeFunctionData({
    abi: AutomanV4__factory.abi,
    args: [decreaseLiquidityParams, zapOutParams, permitParams] as const,
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

export function getAutomanV4RebalanceCalldata(
  amm: AutomatedMarketMakerEnum,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  tokenId: bigint,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  swapData: Hex = '0x',
  permitInfo?: PermitInfo,
): Hex {
  const zapOutParams: ZapOutParams = {
    token0FeeAmount,
    token1FeeAmount,
    tokenOut: NULL_ADDRESS,
    tokenOutMin: BigInt(0),
    swapData0: '0x',
    swapData1: '0x',
    isUnwrapNative: true,
  };
  if (permitInfo === undefined) {
    if (amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
      return encodeFunctionData({
        abi: ISlipStreamAutomanV4__factory.abi,
        args: [
          mintParams as SlipStreamMintParams,
          tokenId,
          swapData,
          /* isCollect= */ false,
          zapOutParams,
        ] as const,
        functionName: 'rebalance',
      });
    }
    return encodeFunctionData({
      abi: AutomanV4__factory.abi,
      args: [
        mintParams as UniV3MintParams,
        tokenId,
        swapData,
        /* isCollect= */ false,
        zapOutParams,
      ] as const,
      functionName: 'rebalance',
    });
  }
  const { v, r, s } = hexToSignature(permitInfo.signature as Hex);
  const permitParams: PermitParams = {
    deadline: BigInt(permitInfo.deadline),
    v: Number(v),
    r,
    s,
  };
  if (amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM) {
    return encodeFunctionData({
      abi: ISlipStreamAutomanV4__factory.abi,
      args: [
        mintParams as SlipStreamMintParams,
        tokenId,
        swapData,
        /* isCollect= */ false,
        zapOutParams,
        permitParams,
      ] as const,
      functionName: 'rebalance',
    });
  }
  return encodeFunctionData({
    abi: AutomanV4__factory.abi,
    args: [
      mintParams as UniV3MintParams,
      tokenId,
      swapData,
      /* isCollect= */ false,
      zapOutParams,
      permitParams,
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

export function getAutomanV4ReinvestCalldata(
  increaseLiquidityParams: IncreaseLiquidityParams,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  swapData: Hex = '0x',
  permitInfo?: PermitInfo,
): Hex {
  if (permitInfo === undefined) {
    return encodeFunctionData({
      abi: AutomanV4__factory.abi,
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
  const permitParams: PermitParams = {
    deadline: BigInt(permitInfo.deadline),
    v: Number(v),
    r,
    s,
  };
  return encodeFunctionData({
    abi: AutomanV4__factory.abi,
    args: [
      increaseLiquidityParams,
      token0FeeAmount,
      token1FeeAmount,
      swapData,
      permitParams,
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
