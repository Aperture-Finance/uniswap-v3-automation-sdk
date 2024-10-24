import {
  ApertureSupportedChainId,
  AutomanV3__factory,
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
  getAutomanIncreaseLiquidityOptimalCallData,
  getAutomanMintOptimalCalldata,
  getAutomanRebalanceCalldata,
  getAutomanReinvestCalldata,
  getAutomanRemoveLiquidityCalldata,
  getAutomanV3IncreaseLiquidityOptimalCallData,
  getAutomanV3MintOptimalCalldata,
  getAutomanV3RebalanceCalldata,
  getAutomanV3ReinvestCalldata,
  getAutomanV3RemoveLiquidityCalldata,
} from './getAutomanCallData';
import { getFromAddress } from './internal';
import {
  IncreaseLiquidityParams,
  IncreaseLiquidityReturnType,
  MintReturnType,
  RebalanceReturnType,
  RemoveLiquidityReturnType,
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

export function getAutomanV3Contract(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient?: PublicClient,
  walletClient?: WalletClient,
): GetContractReturnType<
  typeof AutomanV3__factory.abi,
  PublicClient | WalletClient
> {
  return getContract({
    address: getAMMInfo(chainId, amm)!.apertureAutomanV3,
    abi: AutomanV3__factory.abi,
    client: walletClient ?? publicClient!,
  });
}

export function encodeOptimalSwapData(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
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
      getAMMInfo(chainId, amm)!.optimalSwapRouter!,
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
 * @param blockNumber Optional block number to query.
 * @returns {tokenId, liquidity, amount0, amount1}
 */
export async function simulateMintOptimal(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<MintReturnType> {
  checkTicks(amm, mintParams);
  const returnData = await requestMintOptimal(
    'eth_call',
    chainId,
    amm,
    publicClient,
    from,
    mintParams,
    swapData,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: Automan__factory.abi,
    data: returnData,
    functionName: 'mintOptimal',
  });
}

export async function simulateMintOptimalV3(
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
  checkTicks(amm, mintParams);
  const returnData = await requestMintOptimalV3(
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
    abi: AutomanV3__factory.abi,
    data: returnData,
    functionName: 'mintOptimal',
  });
}

export async function estimateMintOptimalGas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestMintOptimal(
      'eth_estimateGas',
      chainId,
      amm,
      publicClient,
      from,
      mintParams,
      swapData,
      blockNumber,
    ),
  );
}

export async function estimateMintOptimalV3Gas(
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
    await requestMintOptimalV3(
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

export async function requestMintOptimal<M extends keyof RpcReturnType>(
  method: M,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  mintParams: UniV3MintParams | SlipStreamMintParams,
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  checkTicks(amm, mintParams);
  const data = getAutomanMintOptimalCalldata(amm, mintParams, swapData);
  const { apertureAutoman } = getAMMInfo(chainId, amm)!;
  const [token0Overrides, token1Overrides] = await Promise.all([
    getERC20Overrides(
      mintParams.token0,
      from,
      apertureAutoman,
      mintParams.amount0Desired,
      publicClient,
    ),
    getERC20Overrides(
      mintParams.token1,
      from,
      apertureAutoman,
      mintParams.amount1Desired,
      publicClient,
    ),
  ]);
  return tryRequestWithOverrides(
    method,
    {
      from,
      to: apertureAutoman,
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

export async function requestMintOptimalV3<M extends keyof RpcReturnType>(
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
  const data = getAutomanV3MintOptimalCalldata(
    amm,
    mintParams,
    swapData,
    token0FeeAmount,
    token1FeeAmount,
  );
  const { apertureAutomanV3 } = getAMMInfo(chainId, amm)!;
  const [token0Overrides, token1Overrides] = await Promise.all([
    getERC20Overrides(
      mintParams.token0,
      from,
      apertureAutomanV3,
      mintParams.amount0Desired,
      publicClient,
    ),
    getERC20Overrides(
      mintParams.token1,
      from,
      apertureAutomanV3,
      mintParams.amount1Desired,
      publicClient,
    ),
  ]);
  return tryRequestWithOverrides(
    method,
    {
      from,
      to: apertureAutomanV3,
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
export async function simulateIncreaseLiquidityOptimal(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  position: Position,
  increaseParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<IncreaseLiquidityReturnType> {
  const returnData = await requestIncreaseLiquidityOptimal(
    'eth_call',
    chainId,
    amm,
    publicClient,
    from,
    position,
    increaseParams,
    swapData,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: Automan__factory.abi,
    data: returnData,
    functionName: 'increaseLiquidityOptimal',
  });
}

export async function simulateIncreaseLiquidityOptimalV3(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  position: Position,
  increaseParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<IncreaseLiquidityReturnType> {
  const returnData = await requestIncreaseLiquidityOptimalV3(
    'eth_call',
    chainId,
    amm,
    publicClient,
    from,
    position,
    increaseParams,
    swapData,
    blockNumber,
  );
  return decodeFunctionResult({
    abi: AutomanV3__factory.abi,
    data: returnData,
    functionName: 'increaseLiquidityOptimal',
  });
}

export async function estimateIncreaseLiquidityOptimalGas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  position: Position,
  increaseParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestIncreaseLiquidityOptimal(
      'eth_estimateGas',
      chainId,
      amm,
      publicClient,
      from,
      position,
      increaseParams,
      swapData,
      blockNumber,
    ),
  );
}

export async function estimateIncreaseLiquidityOptimalV3Gas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  position: Position,
  increaseParams: IncreaseLiquidityParams,
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestIncreaseLiquidityOptimalV3(
      'eth_estimateGas',
      chainId,
      amm,
      publicClient,
      from,
      position,
      increaseParams,
      swapData,
      blockNumber,
    ),
  );
}

export async function requestIncreaseLiquidityOptimal<
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
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  const data = getAutomanIncreaseLiquidityOptimalCallData(
    increaseParams,
    swapData,
  );
  const { apertureAutoman } = getAMMInfo(chainId, amm)!;

  const [token0Overrides, token1Overrides] = await Promise.all([
    getERC20Overrides(
      position.pool.token0.address as Address,
      from,
      apertureAutoman,
      increaseParams.amount0Desired,
      publicClient,
    ),
    getERC20Overrides(
      position.pool.token1.address as Address,
      from,
      apertureAutoman,
      increaseParams.amount1Desired,
      publicClient,
    ),
  ]);

  return tryRequestWithOverrides(
    method,
    {
      from,
      to: apertureAutoman,
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

export async function requestIncreaseLiquidityOptimalV3<
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
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  const data = getAutomanV3IncreaseLiquidityOptimalCallData(
    increaseParams,
    swapData,
  );
  const { apertureAutomanV3 } = getAMMInfo(chainId, amm)!;

  const [token0Overrides, token1Overrides] = await Promise.all([
    getERC20Overrides(
      position.pool.token0.address as Address,
      from,
      apertureAutomanV3,
      increaseParams.amount0Desired,
      publicClient,
    ),
    getERC20Overrides(
      position.pool.token1.address as Address,
      from,
      apertureAutomanV3,
      increaseParams.amount1Desired,
      publicClient,
    ),
  ]);

  return tryRequestWithOverrides(
    method,
    {
      from,
      to: apertureAutomanV3,
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
 * Simulate a `removeLiquidity` call.
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
): Promise<RemoveLiquidityReturnType> {
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
 * Simulate a `removeLiquidity` call.
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
export async function simulateRemoveLiquidityV3(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  owner: Address,
  tokenId: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  blockNumber?: bigint,
  customDestContract?: Address,
): Promise<RemoveLiquidityReturnType> {
  const data = getAutomanV3RemoveLiquidityCalldata(
    tokenId,
    BigInt(Math.floor(Date.now() / 1000 + 60 * 30)),
    amount0Min,
    amount1Min,
    token0FeeAmount,
    token1FeeAmount,
  );
  const destContract =
    customDestContract ?? getAMMInfo(chainId, amm)!.apertureAutomanV3;
  return decodeFunctionResult({
    abi: AutomanV3__factory.abi,
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
    /* permitInfo= */ undefined,
    swapData,
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

export async function requestRebalanceV3<M extends keyof RpcReturnType>(
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
  const data = getAutomanV3RebalanceCalldata(
    amm,
    mintParams,
    tokenId,
    token0FeeAmount,
    token1FeeAmount,
    /* permitInfo= */ undefined,
    swapData,
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
      to: getAMMInfo(chainId, amm)!.apertureAutomanV3,
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
export async function simulateRebalanceV3(
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
  const data = await requestRebalanceV3(
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
    abi: AutomanV3__factory.abi,
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

export async function estimateRebalanceV3Gas(
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
    await requestRebalanceV3(
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
  tokenId: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  feeBips = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  const data = getAutomanReinvestCalldata(
    tokenId,
    deadline,
    amount0Min,
    amount1Min,
    feeBips,
    /* permitInfo= */ undefined,
    swapData,
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

export async function requestReinvestV3<M extends keyof RpcReturnType>(
  method: M,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  tokenId: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  const data = getAutomanV3ReinvestCalldata(
    tokenId,
    deadline,
    amount0Min,
    amount1Min,
    token0FeeAmount,
    token1FeeAmount,
    /* permitInfo= */ undefined,
    swapData,
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
      to: getAMMInfo(chainId, amm)!.apertureAutomanV3,
      data,
    },
    publicClient,
    overrides,
    blockNumber,
  );
}

export async function estimateReinvestGas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  tokenId: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
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
      tokenId,
      deadline,
      amount0Min,
      amount1Min,
      feeBips,
      swapData,
      blockNumber,
    ),
  );
}

export async function estimateReinvestV3Gas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  tokenId: bigint,
  deadline: bigint,
  amount0Min = BigInt(0),
  amount1Min = BigInt(0),
  token0FeeAmount = BigInt(0),
  token1FeeAmount = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestReinvestV3(
      'eth_estimateGas',
      chainId,
      amm,
      publicClient,
      from,
      owner,
      tokenId,
      deadline,
      amount0Min,
      amount1Min,
      token0FeeAmount,
      token1FeeAmount,
      swapData,
      blockNumber,
    ),
  );
}
