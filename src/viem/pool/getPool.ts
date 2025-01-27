import {
  ApertureSupportedChainId,
  IUniswapV3Pool__factory,
  computePoolAddress,
  getLogger,
} from '@/index';
import { Pool } from '@aperture_finance/uniswap-v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { ISlipStreamCLPool__factory } from 'aperture-lens';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import {
  Address,
  GetContractReturnType,
  PublicClient,
  WalletClient,
  getContract,
} from 'viem';

import { getBulkTokens, getToken } from '../currency';
import { getPublicClient } from '../public_client';

/**
 * Constructs a Uniswap SDK Pool object for an existing and initialized pool.
 * Note that the constructed pool's `token0` and `token1` will be sorted, but the input `tokenA` and `tokenB` don't have to be.
 * @param tokenA One of the tokens in the pool.
 * @param tokenB The other token in the pool.
 * @param feeOrTickSpacing Fee tier (for UniV3 / PCSV3 ) ot tickSpacing (for SlipStream) of the pool.
 * @param chainId Chain id.
 * @param amm Automated Market Maker.
 * @param publicClient Viem public client.
 * @param blockNumber Optional block number to query.
 * @returns The constructed Uniswap SDK Pool object.
 */
export async function getPool(
  tokenA: Token | string,
  tokenB: Token | string,
  feeOrTickSpacing: number,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient?: PublicClient,
  blockNumber?: bigint,
): Promise<Pool> {
  const client = publicClient ?? getPublicClient(chainId);
  const poolContract = getPoolContract(
    tokenA,
    tokenB,
    feeOrTickSpacing,
    chainId,
    amm,
    client,
  );

  const tokenAAddress = (
    typeof tokenA === 'string' ? tokenA : tokenA.address
  ) as Address;
  const tokenBAddress = (
    typeof tokenB === 'string' ? tokenB : tokenB.address
  ) as Address;

  try {
    const contracts = [
      {
        ...poolContract,
        functionName: 'slot0',
      },
      {
        ...poolContract,
        functionName: 'liquidity',
      },
    ];

    // Add fee call for Slipstream pools
    if (amm === AutomatedMarketMakerEnum.Enum.SLIPSTREAM) {
      contracts.push({
        ...poolContract,
        functionName: 'fee',
      });
    }

    const [tokenACanon, tokenBCanon, poolResults] = await Promise.all([
      getToken(
        tokenAAddress,
        chainId,
        client,
        blockNumber,
        /* showSymbolAndName= */ true,
      ),
      getToken(
        tokenBAddress,
        chainId,
        client,
        blockNumber,
        /* showSymbolAndName= */ true,
      ),
      client.multicall({
        contracts,
        blockNumber,
      }),
    ]);

    const [slot0Result, liquidityResult, feeResult] = poolResults;

    if (
      slot0Result.status !== 'success' ||
      liquidityResult.status !== 'success'
    ) {
      throw new Error('Failed to fetch pool data');
    }

    const [sqrtPriceX96, tick] = slot0Result.result as unknown as [
      bigint,
      number,
    ];
    if (sqrtPriceX96 === BigInt(0)) {
      throw new Error('Pool has been created but not yet initialized');
    }

    const inRangeLiquidity = liquidityResult.result as bigint;

    let fee = feeOrTickSpacing;
    let tickSpacing: number | undefined = undefined;

    if (amm === AutomatedMarketMakerEnum.Enum.SLIPSTREAM) {
      if (feeResult?.status !== 'success') {
        throw new Error('Failed to fetch Slipstream pool fee');
      }
      fee = Number(feeResult.result);
      tickSpacing = feeOrTickSpacing;
    }

    return new Pool(
      tokenACanon,
      tokenBCanon,
      fee,
      sqrtPriceX96.toString(),
      inRangeLiquidity.toString(),
      tick,
      undefined,
      tickSpacing,
    );
  } catch (error) {
    console.error('Error fetching pool data:', error);
    throw error;
  }
}

/**
 * Get the `IUniswapV3Pool` contract.
 */
export function getPoolContract(
  tokenA: Token | string,
  tokenB: Token | string,
  feeOrTickSpacing: number,
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient?: PublicClient,
  walletClient?: WalletClient,
): GetContractReturnType<
  typeof IUniswapV3Pool__factory.abi | typeof ISlipStreamCLPool__factory.abi,
  PublicClient | WalletClient
> {
  return getContract({
    address: computePoolAddress(chainId, amm, tokenA, tokenB, feeOrTickSpacing),
    abi:
      amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
        ? ISlipStreamCLPool__factory.abi
        : IUniswapV3Pool__factory.abi,
    client: walletClient ?? publicClient!,
  });
}

export async function getBulkPools(
  params: {
    tokenA: Token | string;
    tokenB: Token | string;
    feeOrTickSpacing: number;
  }[],
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient?: PublicClient,
  blockNumber?: bigint,
): Promise<Array<Pool | null>> {
  const client = publicClient ?? getPublicClient(chainId);

  try {
    // Create pool contracts for each parameter set
    const poolContracts: GetContractReturnType<
      | typeof IUniswapV3Pool__factory.abi
      | typeof ISlipStreamCLPool__factory.abi,
      PublicClient | WalletClient
    >[] = params.map(({ tokenA, tokenB, feeOrTickSpacing }) =>
      getPoolContract(tokenA, tokenB, feeOrTickSpacing, chainId, amm, client),
    );

    // Prepare token addresses for bulk fetching
    const tokenAddresses = new Set<Address>();
    params.forEach(({ tokenA, tokenB }) => {
      tokenAddresses.add(
        (typeof tokenA === 'string' ? tokenA : tokenA.address) as Address,
      );
      tokenAddresses.add(
        (typeof tokenB === 'string' ? tokenB : tokenB.address) as Address,
      );
    });

    // Create multicall contracts array
    const contracts = poolContracts.flatMap((poolContract) => {
      const baseContracts = [
        {
          ...poolContract,
          functionName: 'slot0',
        },
        {
          ...poolContract,
          functionName: 'liquidity',
        },
      ];

      if (amm === AutomatedMarketMakerEnum.Enum.SLIPSTREAM) {
        baseContracts.push({
          ...poolContract,
          functionName: 'fee',
        });
      }

      return baseContracts;
    });

    // Fetch all tokens and pool data in parallel
    const [tokens, poolResults] = await Promise.all([
      getBulkTokens(Array.from(tokenAddresses), chainId, client, blockNumber),
      client.multicall({
        contracts,
        blockNumber,
      }),
    ]);

    // Create a map of token addresses to Token objects
    const tokenMap = new Map(
      tokens.map((token) => [token.address.toLowerCase(), token]),
    );

    // Process results
    return params.map(({ tokenA, tokenB, feeOrTickSpacing }, index) => {
      const tokenAAddress = (
        typeof tokenA === 'string' ? tokenA : tokenA.address
      ).toLowerCase();
      const tokenBAddress = (
        typeof tokenB === 'string' ? tokenB : tokenB.address
      ).toLowerCase();

      const poolId = `${tokenAAddress}-${tokenBAddress}-${feeOrTickSpacing}`;

      const baseIndex =
        amm === AutomatedMarketMakerEnum.Enum.SLIPSTREAM
          ? index * 3
          : index * 2;
      const [slot0Result, liquidityResult, feeResult] = poolResults.slice(
        baseIndex,
        baseIndex + (amm === AutomatedMarketMakerEnum.Enum.SLIPSTREAM ? 3 : 2),
      );

      if (
        slot0Result.status !== 'success' ||
        liquidityResult.status !== 'success'
      ) {
        console.warn(`Failed to fetch pool data for tokens ${poolId}`, {
          slot0Result,
          liquidityResult,
        });
        return null;
      }

      const [sqrtPriceX96, tick] = slot0Result.result as unknown as [
        bigint,
        number,
      ];
      if (sqrtPriceX96 === BigInt(0)) {
        console.warn(
          `Pool has been created but not yet initialized for tokens ${poolId}`,
        );
        return null;
      }

      const inRangeLiquidity = liquidityResult.result as bigint;

      let fee = feeOrTickSpacing;
      let tickSpacing: number | undefined = undefined;

      if (amm === AutomatedMarketMakerEnum.Enum.SLIPSTREAM) {
        if (feeResult?.status !== 'success') {
          console.warn(
            `Failed to fetch Slipstream pool fee for tokens ${poolId}`,
            {
              feeResult,
            },
          );
          return null;
        }
        fee = Number(feeResult.result);
        tickSpacing = feeOrTickSpacing;
      }

      const tokenACanon = tokenMap.get(tokenAAddress);
      const tokenBCanon = tokenMap.get(tokenBAddress);

      if (!tokenACanon || !tokenBCanon) {
        console.warn(`Token not found in fetched tokens for ${poolId}`);
        return null;
      }

      return new Pool(
        tokenACanon,
        tokenBCanon,
        fee,
        sqrtPriceX96.toString(),
        inRangeLiquidity.toString(),
        tick,
        undefined,
        tickSpacing,
      );
    });
  } catch (error) {
    getLogger().error('Error in bulk pool fetch:', {
      msg: (error as Error).message,
    });
    throw error;
  }
}
