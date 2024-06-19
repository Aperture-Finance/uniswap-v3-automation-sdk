import {
  ApertureSupportedChainId,
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
} from './getAutomanCallData';
import { getFromAddress } from './internal';
import {
  IncreaseLiquidityParams,
  IncreaseLiquidityReturnType,
  MintParams,
  MintReturnType,
  RebalanceReturnType,
  RemoveLiquidityReturnType,
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

export function encodeOptimalSwapData(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0: Address,
  token1: Address,
  fee: FeeAmount,
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
        [token0, token1, fee, tickLower, tickUpper, zeroForOne, approveTarget, router, data],
      ),
    ],
  );
}

function checkTicks(mintParams: MintParams) {
  const { tickLower, tickUpper } = mintParams;
  const fee = mintParams.fee as FeeAmount;
  if (
    tickLower !== nearestUsableTick(tickLower, TICK_SPACINGS[fee]) ||
    tickUpper !== nearestUsableTick(tickUpper, TICK_SPACINGS[fee])
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
  mintParams: MintParams,
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<MintReturnType> {
  checkTicks(mintParams);
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

export async function estimateMintOptimalGas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  mintParams: MintParams,
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

export async function requestMintOptimal<M extends keyof RpcReturnType>(
  method: M,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address,
  mintParams: MintParams,
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  checkTicks(mintParams);
  const data = getAutomanMintOptimalCalldata(mintParams, swapData);
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
): Promise<RemoveLiquidityReturnType> {
  const data = getAutomanRemoveLiquidityCalldata(
    tokenId,
    BigInt(Math.floor(Date.now() / 1000 + 60 * 30)),
    amount0Min,
    amount1Min,
    feeBips,
  );
  return decodeFunctionResult({
    abi: Automan__factory.abi,
    data: await tryRequestWithOverrides(
      'eth_call',
      {
        from,
        to: getAMMInfo(chainId, amm)!.apertureAutoman,
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
  mintParams: MintParams,
  tokenId: bigint,
  feeBips = BigInt(0),
  swapData: Hex = '0x',
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  checkTicks(mintParams);
  const data = getAutomanRebalanceCalldata(
    mintParams,
    tokenId,
    feeBips,
    undefined,
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
  mintParams: MintParams,
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

export async function estimateRebalanceGas(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  from: Address | undefined,
  owner: Address,
  mintParams: MintParams,
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
    undefined,
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
