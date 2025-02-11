import {
  ApertureSupportedChainId,
  AutomanV4__factory,
  Automan__factory,
  getAMMInfo,
} from '@/index';
import {
  FeeAmount,
  Position,
  TICK_SPACINGS,
  nearestUsableTick,
} from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import {
  Address,
  GetContractReturnType,
  Hex,
  PublicClient,
  WalletClient,
  decodeFunctionResult,
  encodePacked,
  getContract,
  hexToBigInt,
} from 'viem';

import {
  RpcReturnType,
  getControllerOverrides,
  getERC20Overrides,
  getNPMApprovalOverrides,
  tryRequestWithOverrides,
} from '../overrides';
import {
  getAutomanDecreaseLiquidityToTokenOutCalldata,
  getAutomanRebalanceCalldata,
  getAutomanReinvestCalldata,
  getAutomanRemoveLiquidityCalldata,
  getAutomanV4DecreaseLiquidityCalldata,
  getAutomanV4IncreaseLiquidityOptimalCallData,
  getAutomanV4MintOptimalCalldata,
  getAutomanV4RebalanceCalldata,
  getAutomanV4ReinvestCalldata,
} from './getAutomanCallData';
import { getFromAddress } from './internal';
import {
  DecreaseLiquidityParams,
  DecreaseLiquidityReturnType,
  DecreaseLiquidityToTokenOutReturnType,
  IncreaseLiquidityParams,
  IncreaseLiquidityReturnType,
  MintReturnType,
  RebalanceReturnType,
  ReinvestReturnType,
  SlipStreamMintParams,
  UniV3MintParams,
} from './types';

export function getAutomanContract(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient?: PublicClient,
  walletClient?: WalletClient,
): GetContractReturnType<
  typeof Automan__factory.abi,
  PublicClient | WalletClient
> {
  return getContract({
    address: getAMMInfo(chainId, amm)!.apertureAutoman,
    abi: Automan__factory.abi,
    client: walletClient ?? publicClient!,
  });
}

export function getAutomanV4Contract(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient?: PublicClient,
  walletClient?: WalletClient,
): GetContractReturnType<
  typeof AutomanV4__factory.abi,
  PublicClient | WalletClient
> {
  return getContract({
    address: getAMMInfo(chainId, amm)!.apertureAutomanV4,
    abi: AutomanV4__factory.abi,
    client: walletClient ?? publicClient!,
  });
}

export function encodeOptimalSwapData(
  from: Address,
  token0: Address,
  token1: Address,
  feeOrTickSpacing: number,
  tickLower: number,
  tickUpper: number,
  zeroForOne: boolean,
  approveTarget: Address,
  router: Address,
  data: Hex,
): Hex {
  return encodePacked(
    ['address', 'bytes'],
    [
      from,
      encodePacked(
        // prettier-ignore
        ["address", "address", "uint24", "int24", "int24", "bool", "address", "address", "bytes"],
        // prettier-ignore
        [token0, token1, feeOrTickSpacing, tickLower, tickUpper, zeroForOne, approveTarget, router, data],
      ),
    ],
  );
}

function checkTicks(
  amm: AutomatedMarketMakerEnum,
  mintParams: UniV3MintParams | SlipStreamMintParams,
) {
  const { tickLower, tickUpper } = mintParams;
  const tickSpacing =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? (mintParams as SlipStreamMintParams).tickSpacing
      : TICK_SPACINGS[(mintParams as UniV3MintParams).fee as FeeAmount];
  if (
    tickLower !== nearestUsableTick(tickLower, tickSpacing) ||
    tickUpper !== nearestUsableTick(tickUpper, tickSpacing)
  ) {
    throw new Error('tickLower or tickUpper not valid');
  }
}

/**
 * Simulate a `mintOptimal` call by overriding the balances and allowances of the tokens involved.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param publicClient Viem public client.
 * @param from The address to simulate the call from.
 * @param mintParams The mint parameters.
 * @param swapData The swap data if using a router.
 * @param token0FeeAmount The amount of token0 to send to feeCollector.
 * @param token1FeeAmount The amount of token1 to send to feeCollector.
 * @param blockNumber Optional block number to query.
 * @returns {tokenId, liquidity, amount0, amount1}
 */
export async function simulateMintOptimalV4(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  swapData: Hex = '0x',
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  blockNumber?: bigint,
): Promise<MintReturnType> {
  const returnData = await requestMintOptimalV4(
    'eth_call',
    chainId,
    amm,
    publicClient,
    from,
    mintParams,
    swapData,
    token0FeeAmount,
    token1FeeAmount,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: AutomanV4__factory.abi,
    data: returnData,
    functionName: 'mintOptimal',
  });
}

export async function estimateMintOptimalV4Gas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  swapData: Hex = '0x',
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestMintOptimalV4(
      'eth_estimateGas',
      chainId,
      amm,
      publicClient,
      from,
      mintParams,
      swapData,
      token0FeeAmount,
      token1FeeAmount,
      blockNumber,
    ),
  );
}

export async function requestMintOptimalV4<M extends keyof RpcReturnType>(
  method: M,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  swapData: Hex = '0x',
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  checkTicks(amm, mintParams);
  const data = getAutomanV4MintOptimalCalldata(
    amm,
    mintParams,
    swapData,
    token0FeeAmount,
    token1FeeAmount,
  );
  const { apertureAutomanV4 } = getAMMInfo(chainId, amm)!;
  const [token0Overrides, token1Overrides] = await Promise.all([
    getERC20Overrides(
      mintParams.token0,
      from,
      apertureAutomanV4,
      mintParams.amount0Desired,
      publicClient,
    ),
    getERC20Overrides(
      mintParams.token1,
      from,
      apertureAutomanV4,
      mintParams.amount1Desired,
      publicClient,
    ),
  ]);
  return tryRequestWithOverrides(
    method,
    {
      from,
      to: apertureAutomanV4,
      data,
    },
    publicClient,
    {
      ...token0Overrides,
      ...token1Overrides,
    },
    blockNumber,
  );
}

/**
 * Simulate a `increaseLiquidityOptimal` call by overriding the balances and allowances of the tokens involved.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param publicClient Viem public client.
 * @param from The address to simulate the call from.
 * @param position The current position to simulate the call from.
 * @param increaseParams The increase liquidity parameters.
 * @param swapData The swap data if using a router.
 * @param blockNumber Optional block number to query.
 * @returns {tokenId, liquidity, amount0, amount1}
 */
export async function simulateIncreaseLiquidityOptimalV4(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  position: Position,
  increaseParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  blockNumber?: bigint,
): Promise<IncreaseLiquidityReturnType> {
  const returnData = await requestIncreaseLiquidityOptimalV4(
    'eth_call',
    chainId,
    amm,
    publicClient,
    from,
    position,
    increaseParams,
    swapData,
    token0FeeAmount,
    token1FeeAmount,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: AutomanV4__factory.abi,
    data: returnData,
    functionName: 'increaseLiquidityOptimal',
  });
}

export async function estimateIncreaseLiquidityOptimalV4Gas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  position: Position,
  increaseParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestIncreaseLiquidityOptimalV4(
      'eth_estimateGas',
      chainId,
      amm,
      publicClient,
      from,
      position,
      increaseParams,
      swapData,
      token0FeeAmount,
      token1FeeAmount,
      blockNumber,
    ),
  );
}

export async function requestIncreaseLiquidityOptimalV4<
  M extends keyof RpcReturnType,
>(
  method: M,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  position: Position,
  increaseParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  const data = getAutomanV4IncreaseLiquidityOptimalCallData(
    increaseParams,
    swapData,
    token0FeeAmount,
    token1FeeAmount,
  );
  const { apertureAutomanV4 } = getAMMInfo(chainId, amm)!;

  const [token0Overrides, token1Overrides] = await Promise.all([
    getERC20Overrides(
      position.pool.token0.address as Address,
      from,
      apertureAutomanV4,
      increaseParams.amount0Desired,
      publicClient,
    ),
    getERC20Overrides(
      position.pool.token1.address as Address,
      from,
      apertureAutomanV4,
      increaseParams.amount1Desired,
      publicClient,
    ),
  ]);

  return tryRequestWithOverrides(
    method,
    {
      from,
      to: apertureAutomanV4,
      data,
    },
    publicClient,
    {
      ...token0Overrides,
      ...token1Overrides,
    },
    blockNumber,
  );
}

export async function requestDecreaseLiquidity<M extends keyof RpcReturnType>(
  method: M,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  decreaseLiquidityParams: DecreaseLiquidityParams,
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  from = getFromAddress(from);
  const data = getAutomanV4DecreaseLiquidityCalldata(decreaseLiquidityParams);
  const { apertureAutomanV4 } = getAMMInfo(chainId, amm)!;

  return tryRequestWithOverrides(
    method,
    {
      from,
      to: apertureAutomanV4,
      data,
    },
    publicClient,
    {
      ...getNPMApprovalOverrides(chainId, amm, owner),
    },
    blockNumber,
  );
}

export async function simulateDecreaseLiquidityToTokenOut(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  from: Address,
  owner: Address,
  decreaseLiquidityParams: DecreaseLiquidityParams,
  tokenOut: Address,
  tokenOutMin: bigint,
  swapData0: Hex = '0x',
  swapData1: Hex = '0x',
  isUnwrapNative = true,
  blockNumber?: bigint,
): Promise<DecreaseLiquidityToTokenOutReturnType> {
  const returnData = await requestDecreaseLiquidityToTokenOut(
    'eth_call',
    amm,
    chainId,
    publicClient,
    from,
    owner,
    decreaseLiquidityParams,
    tokenOut,
    tokenOutMin,
    swapData0,
    swapData1,
    isUnwrapNative,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: AutomanV4__factory.abi,
    data: returnData,
    functionName: 'decreaseLiquidityToTokenOut',
  });
}

export async function estimateDecreaseLiquidityToTokenOutGas(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  from: Address,
  owner: Address,
  decreaseLiquidityParams: DecreaseLiquidityParams,
  tokenOut: Address,
  tokenOutMin: bigint,
  swapData0: Hex = '0x',
  swapData1: Hex = '0x',
  isUnwrapNative = true,
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestDecreaseLiquidityToTokenOut(
      'eth_estimateGas',
      amm,
      chainId,
      publicClient,
      from,
      owner,
      decreaseLiquidityParams,
      tokenOut,
      tokenOutMin,
      swapData0,
      swapData1,
      isUnwrapNative,
      blockNumber,
    ),
  );
}

export async function requestDecreaseLiquidityToTokenOut<
  M extends keyof RpcReturnType,
>(
  method: M,
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  decreaseLiquidityParams: DecreaseLiquidityParams,
  tokenOut: Address,
  tokenOutMin: bigint,
  swapData0: Hex = '0x',
  swapData1: Hex = '0x',
  isUnwrapNative = true,
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  from = getFromAddress(from);
  const data = getAutomanDecreaseLiquidityToTokenOutCalldata(
    decreaseLiquidityParams,
    tokenOut,
    tokenOutMin,
    swapData0,
    swapData1,
    isUnwrapNative,
  );
  const { apertureAutomanV4 } = getAMMInfo(chainId, amm)!;

  return tryRequestWithOverrides(
    method,
    {
      from,
      to: apertureAutomanV4,
      data,
    },
    publicClient,
    {
      ...getNPMApprovalOverrides(chainId, amm, owner),
      ...getControllerOverrides(chainId, amm, from),
    },
    blockNumber,
  );
}

/**
 * Simulate a `removeLiquidity` call. Uses AutomanV1 for backend.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param publicClient Viem public client.
 * @param from The address to simulate the call from.
 * @param owner The owner of the position to burn.
 * @param tokenId The token ID of the position to burn.
 * @param amount0Min The minimum amount of token0 to receive.
 * @param amount1Min The minimum amount of token1 to receive.
 * @param feeBips The percentage of position value to pay as a fee, multiplied by 1e18.
 * @param blockNumber Optional block number to query.
 */
export async function simulateRemoveLiquidity(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  owner: Address,
  tokenId: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  feeBips = BigInt(0),
  blockNumber?: bigint,
  customDestContract?: Address,
): Promise<DecreaseLiquidityReturnType> {
  const data = getAutomanRemoveLiquidityCalldata(
    tokenId,
    BigInt(Math.floor(Date.now() / 1000 + 60 * 30)),
    amount0Min,
    amount1Min,
    feeBips,
  );
  const destContract =
    customDestContract ?? getAMMInfo(chainId, amm)!.apertureAutoman;
  return decodeFunctionResult({
    abi: Automan__factory.abi,
    data: await tryRequestWithOverrides(
      'eth_call',
      {
        from,
        to: destContract,
        data,
      },
      publicClient,
      getNPMApprovalOverrides(chainId, amm, owner),
      blockNumber,
    ),
    functionName: 'removeLiquidity',
  });
}

/**
 * Simulate a `decreaseLiquidity` call.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param publicClient Viem public client.
 * @param from The address to simulate the call from.
 * @param owner The owner of the position to burn.
 * @param tokenId The token ID of the position to burn.
 * @param amount0Min The minimum amount of token0 to receive.
 * @param amount1Min The minimum amount of token1 to receive.
 * @param token0FeeAmount The amount of token0 to send to feeCollector.
 * @param token1FeeAmount The amount of token1 to send to feeCollector.
 * @param blockNumber Optional block number to query.
 */
export async function simulateDecreaseLiquidity(
  amm: AutomatedMarketMakerEnum,
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  from: Address,
  owner: Address,
  decreaseLiquidityParams: DecreaseLiquidityParams,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  isUnwrapNative = true,
  blockNumber?: bigint,
  customDestContract?: Address,
): Promise<DecreaseLiquidityReturnType> {
  const data = getAutomanV4DecreaseLiquidityCalldata(
    decreaseLiquidityParams,
    token0FeeAmount,
    token1FeeAmount,
    isUnwrapNative,
  );
  const destContract =
    customDestContract ?? getAMMInfo(chainId, amm)!.apertureAutomanV4;
  return decodeFunctionResult({
    abi: AutomanV4__factory.abi,
    data: await tryRequestWithOverrides(
      'eth_call',
      {
        from,
        to: destContract,
        data,
      },
      publicClient,
      getNPMApprovalOverrides(chainId, amm, owner),
      blockNumber,
    ),
    functionName: 'decreaseLiquidity',
  });
}

export async function requestRebalance<M extends keyof RpcReturnType>(
  method: M,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  tokenId: bigint,
  feeBips = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  checkTicks(amm, mintParams);
  const data = getAutomanRebalanceCalldata(
    amm,
    mintParams,
    tokenId,
    feeBips,
    swapData,
    /* permitInfo= */ undefined,
  );
  from = getFromAddress(from);
  const overrides = {
    ...getNPMApprovalOverrides(chainId, amm, owner),
    ...getControllerOverrides(chainId, amm, from),
  };
  return tryRequestWithOverrides(
    method,
    {
      from,
      to: getAMMInfo(chainId, amm)!.apertureAutoman,
      data,
    },
    publicClient,
    overrides,
    blockNumber,
  );
}

export async function requestRebalanceV4<M extends keyof RpcReturnType>(
  method: M,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  tokenId: bigint,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  checkTicks(amm, mintParams);
  const data = getAutomanV4RebalanceCalldata(
    amm,
    mintParams,
    tokenId,
    token0FeeAmount,
    token1FeeAmount,
    swapData,
    /* permitInfo= */ undefined,
  );
  from = getFromAddress(from);
  const overrides = {
    ...getNPMApprovalOverrides(chainId, amm, owner),
    ...getControllerOverrides(chainId, amm, from),
  };
  return tryRequestWithOverrides(
    method,
    {
      from,
      to: getAMMInfo(chainId, amm)!.apertureAutomanV4,
      data,
    },
    publicClient,
    overrides,
    blockNumber,
  );
}

/**
 * Simulate a `rebalance` call.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param publicClient Viem public client.
 * @param from The address to simulate the call from.
 * @param owner The owner of the position to rebalance.
 * @param mintParams The mint parameters.
 * @param tokenId The token ID of the position to rebalance.
 * @param feeBips The percentage of position value to pay as a fee, multiplied by 1e18.
 * @param swapData The swap data if using a router.
 * @param blockNumber Optional block number to query.
 */
export async function simulateRebalance(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  tokenId: bigint,
  feeBips = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<RebalanceReturnType> {
  const data = await requestRebalance(
    'eth_call',
    chainId,
    amm,
    publicClient,
    from,
    owner,
    mintParams,
    tokenId,
    feeBips,
    swapData,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: Automan__factory.abi,
    data,
    functionName: 'rebalance',
  });
}

/**
 * Simulate a `rebalance` call.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param publicClient Viem public client.
 * @param from The address to simulate the call from.
 * @param owner The owner of the position to rebalance.
 * @param mintParams The mint parameters.
 * @param tokenId The token ID of the position to rebalance.
 * @param token0FeeAmount The amount of token0 to send to feeCollector.
 * @param token1FeeAmount The amount of token1 to send to feeCollector.
 * @param swapData The swap data if using a router.
 * @param blockNumber Optional block number to query.
 */
export async function simulateRebalanceV4(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  tokenId: bigint,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<RebalanceReturnType> {
  const data = await requestRebalanceV4(
    'eth_call',
    chainId,
    amm,
    publicClient,
    from,
    owner,
    mintParams,
    tokenId,
    token0FeeAmount,
    token1FeeAmount,
    swapData,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: AutomanV4__factory.abi,
    data,
    functionName: 'rebalance',
  });
}

export async function estimateRebalanceGas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  tokenId: bigint,
  feeBips = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestRebalance(
      'eth_estimateGas',
      chainId,
      amm,
      publicClient,
      from,
      owner,
      mintParams,
      tokenId,
      feeBips,
      swapData,
      blockNumber,
    ),
  );
}

export async function estimateRebalanceV4Gas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  tokenId: bigint,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestRebalanceV4(
      'eth_estimateGas',
      chainId,
      amm,
      publicClient,
      from,
      owner,
      mintParams,
      tokenId,
      token0FeeAmount,
      token1FeeAmount,
      swapData,
      blockNumber,
    ),
  );
}

export async function requestReinvest<M extends keyof RpcReturnType>(
  method: M,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  increaseLiquidityParams: IncreaseLiquidityParams,
  feeBips = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  const data = getAutomanReinvestCalldata(
    increaseLiquidityParams,
    feeBips,
    swapData,
    /* permitInfo= */ undefined,
  );
  from = getFromAddress(from);
  const overrides = {
    ...getNPMApprovalOverrides(chainId, amm, owner),
    ...getControllerOverrides(chainId, amm, from),
  };
  return tryRequestWithOverrides(
    method,
    {
      from,
      to: getAMMInfo(chainId, amm)!.apertureAutoman,
      data,
    },
    publicClient,
    overrides,
    blockNumber,
  );
}

export async function requestReinvestV4<M extends keyof RpcReturnType>(
  method: M,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  increaseLiquidityParams: IncreaseLiquidityParams,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  const data = getAutomanV4ReinvestCalldata(
    increaseLiquidityParams,
    token0FeeAmount,
    token1FeeAmount,
    swapData,
    /* permitInfo= */ undefined,
  );
  from = getFromAddress(from);
  const overrides = {
    ...getNPMApprovalOverrides(chainId, amm, owner),
    ...getControllerOverrides(chainId, amm, from),
  };
  return tryRequestWithOverrides(
    method,
    {
      from,
      to: getAMMInfo(chainId, amm)!.apertureAutomanV4,
      data,
    },
    publicClient,
    overrides,
    blockNumber,
  );
}

export async function simulateReinvest(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  increaseLiquidityParams: IncreaseLiquidityParams,
  feeBips = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<ReinvestReturnType> {
  const data = await requestReinvest(
    'eth_call',
    chainId,
    amm,
    publicClient,
    from,
    owner,
    increaseLiquidityParams,
    feeBips,
    swapData,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: Automan__factory.abi,
    data,
    functionName: 'reinvest',
  });
}

export async function simulateReinvestV4(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  increaseLiquidityParams: IncreaseLiquidityParams,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<ReinvestReturnType> {
  const data = await requestReinvestV4(
    'eth_call',
    chainId,
    amm,
    publicClient,
    from,
    owner,
    increaseLiquidityParams,
    token0FeeAmount,
    token1FeeAmount,
    swapData,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: AutomanV4__factory.abi,
    data,
    functionName: 'reinvest',
  });
}

export async function estimateReinvestGas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  increaseLiquidityParams: IncreaseLiquidityParams,
  feeBips = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestReinvest(
      'eth_estimateGas',
      chainId,
      amm,
      publicClient,
      from,
      owner,
      increaseLiquidityParams,
      feeBips,
      swapData,
      blockNumber,
    ),
  );
}

export async function estimateReinvestV4Gas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  increaseLiquidityParams: IncreaseLiquidityParams,
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestReinvestV4(
      'eth_estimateGas',
      chainId,
      amm,
      publicClient,
      from,
      owner,
      increaseLiquidityParams,
      token0FeeAmount,
      token1FeeAmount,
      swapData,
      blockNumber,
    ),
  );
}
