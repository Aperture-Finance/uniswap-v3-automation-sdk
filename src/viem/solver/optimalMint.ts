import { ApertureSupportedChainId, getAMMInfo, getLogger } from '@/index';
import { computePoolAddress } from '@/utils';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import Big from 'big.js';
import { Address, Hex, PublicClient } from 'viem';

import {
  SolverResult,
  SwapRoute,
  get1InchQuote,
  getIsOkx,
  getOkxSwap,
} from '.';
import { ALL_SOLVERS, E_Solver, getSolver } from '.';
import {
  SlipStreamMintParams,
  UniV3MintParams,
  encodeOptimalSwapData,
  getAutomanContract,
  simulateMintOptimal,
} from '../automan';
import { estimateMintOptimalGas } from '../automan';
import { getPool } from '../pool';
import { getOkxApproveTarget } from './getOkxSolver';
import {
  calcPriceImpact,
  getFeeOrTickSpacingFromMintParams,
  getSwapPath,
} from './internal';
import {
  buildOptimalSolutions,
  getOptimalSwapAmount,
  getSwapRoute,
} from './internal';

/**
 * Get the optimal amount of liquidity to mint for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fee The pool fee tier.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param fromAddress The address to mint from.
 * @param slippage The slippage tolerance.
 * @param publicClient Viem public client.
 * @param usePool Whether to use the pool or the aggregator for the swap.
 */
export async function optimalMint(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  feeOrTickSpacing: number,
  tickLower: number,
  tickUpper: number,
  fromAddress: Address,
  slippage: number,
  publicClient: PublicClient,
  usePool = false,
  blockNumber?: bigint,
  includeSwapInfo?: boolean,
): Promise<SolverResult> {
  if (!token0Amount.currency.sortsBefore(token1Amount.currency)) {
    throw new Error('token0 must be sorted before token1');
  }
  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0: token0Amount.currency.address as Address,
          token1: token1Amount.currency.address as Address,
          tickSpacing: feeOrTickSpacing,
          tickLower,
          tickUpper,
          amount0Desired: BigInt(token0Amount.quotient.toString()),
          amount1Desired: BigInt(token1Amount.quotient.toString()),
          amount0Min: 0n,
          amount1Min: 0n,
          recipient: fromAddress,
          deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
          sqrtPriceX96: 0n,
        }
      : {
          token0: token0Amount.currency.address as Address,
          token1: token1Amount.currency.address as Address,
          fee: feeOrTickSpacing,
          tickLower,
          tickUpper,
          amount0Desired: BigInt(token0Amount.quotient.toString()),
          amount1Desired: BigInt(token1Amount.quotient.toString()),
          amount0Min: 0n,
          amount1Min: 0n,
          recipient: fromAddress,
          deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
        };

  const getEstimate = async () => {
    const { optimalSwapRouter } = getAMMInfo(chainId, amm)!;
    const poolPromise = optimalMintPool(
      chainId,
      amm,
      publicClient,
      fromAddress,
      mintParams,
      blockNumber,
    );

    if (usePool || !optimalSwapRouter) {
      return await poolPromise;
    }

    const [poolEstimate, routerEstimate] = await Promise.all([
      poolPromise,
      optimalMintRouter(
        chainId,
        amm,
        publicClient,
        fromAddress,
        mintParams,
        slippage,
      ),
    ]);
    // use the same pool if the quote isn't better
    if (poolEstimate.liquidity > routerEstimate.liquidity) {
      return poolEstimate;
    } else {
      return routerEstimate;
    }
  };

  const ret = await getEstimate();

  if (includeSwapInfo) {
    const pool = await getPool(
      mintParams.token0,
      mintParams.token1,
      feeOrTickSpacing,
      chainId,
      amm,
      publicClient,
      blockNumber,
    );

    ret.priceImpact = calcPriceImpact(
      pool,
      mintParams.amount0Desired,
      mintParams.amount1Desired,
      ret.amount0,
      ret.amount1,
    );

    const token0 = (token0Amount.currency as Token).address as Address;
    const token1 = (token1Amount.currency as Token).address as Address;

    ret.swapPath = getSwapPath(
      token0,
      token1,
      BigInt(token0Amount.quotient.toString()),
      BigInt(token1Amount.quotient.toString()),
      ret.amount0,
      ret.amount1,
      slippage,
    );
  }

  return ret;
}

async function optimalMintPool(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  fromAddress: Address,
  mintParams: SlipStreamMintParams | UniV3MintParams,
  blockNumber?: bigint,
): Promise<SolverResult> {
  const [, liquidity, amount0, amount1] = await simulateMintOptimal(
    chainId,
    amm,
    publicClient,
    fromAddress,
    mintParams,
    /* swapData= */ undefined,
    /* blockNumber= */ blockNumber,
  );
  let swapRoute: SwapRoute = [];
  if (mintParams.amount0Desired.toString() !== amount0.toString()) {
    const [fromTokenAddress, toTokenAddress] = new Big(
      mintParams.amount0Desired.toString(),
    ).gt(amount0.toString())
      ? [mintParams.token0, mintParams.token1]
      : [mintParams.token1, mintParams.token0];
    swapRoute = [
      [
        [
          {
            name: 'Pool',
            part: 100,
            fromTokenAddress: fromTokenAddress,
            toTokenAddress: toTokenAddress,
          },
        ],
      ],
    ];
  }

  return {
    amount0,
    amount1,
    liquidity,
    swapData: '0x',
    swapRoute,
  };
}

async function optimalMintRouter(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  fromAddress: Address,
  mintParams: SlipStreamMintParams | UniV3MintParams,
  slippage: number,
): Promise<SolverResult> {
  const { swapData, swapRoute } = await getOptimalMintSwapData(
    chainId,
    amm,
    publicClient,
    mintParams,
    slippage,
    /* blockNumber= */ undefined,
    /* includeRoute= */ true,
  );
  const [, liquidity, amount0, amount1] = await simulateMintOptimal(
    chainId,
    amm,
    publicClient,
    fromAddress,
    mintParams,
    swapData,
    undefined,
  );
  return {
    amount0,
    amount1,
    liquidity,
    swapData,
    swapRoute,
  };
}

async function getOptimalMintSwapData(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  publicClient: PublicClient,
  mintParams: SlipStreamMintParams | UniV3MintParams,
  slippage: number,
  blockNumber?: bigint,
  includeRoute?: boolean,
): Promise<{
  swapData: Hex;
  swapRoute?: SwapRoute;
}> {
  try {
    const automan = getAutomanContract(chainId, amm, publicClient);
    // get swap amounts using the same pool
    const [poolAmountIn, , zeroForOne] = await automan.read.getOptimalSwap(
      [
        computePoolAddress(
          chainId,
          amm,
          mintParams.token0,
          mintParams.token1,
          getFeeOrTickSpacingFromMintParams(amm, mintParams),
        ),
        mintParams.tickLower,
        mintParams.tickUpper,
        mintParams.amount0Desired,
        mintParams.amount1Desired,
      ],
      {
        blockNumber,
      },
    );

    const ammInfo = getAMMInfo(chainId, amm)!;
    const { tx, protocols } = await (getIsOkx()
      ? getOkxSwap(
          chainId,
          zeroForOne ? mintParams.token0 : mintParams.token1,
          zeroForOne ? mintParams.token1 : mintParams.token0,
          poolAmountIn.toString(),
          ammInfo.optimalSwapRouter!,
          slippage,
        )
      : get1InchQuote(
          chainId,
          zeroForOne ? mintParams.token0 : mintParams.token1,
          zeroForOne ? mintParams.token1 : mintParams.token0,
          poolAmountIn.toString(),
          ammInfo.optimalSwapRouter!,
          slippage * 100,
          includeRoute,
        ));

    const approveTarget = await getOkxApproveTarget(
      chainId,
      zeroForOne ? mintParams.token0 : mintParams.token1,
      poolAmountIn.toString(),
    );

    return {
      swapData: encodeOptimalSwapData(
        chainId,
        amm,
        mintParams.token0,
        mintParams.token1,
        getFeeOrTickSpacingFromMintParams(amm, mintParams),
        mintParams.tickLower,
        mintParams.tickUpper,
        zeroForOne,
        approveTarget,
        tx.to,
        tx.data,
      ),
      swapRoute: protocols,
    };
  } catch (e) {
    console.warn(`Failed to get swap data: ${e}`);
  }
  return {
    swapData: '0x',
  };
}

/**
 * Get the optimal amount of liquidity to mint for a given pool and token amounts.
 * @param chainId The chain ID.
 * @param amm The Automated Market Maker.
 * @param token0Amount The token0 amount.
 * @param token1Amount The token1 amount.
 * @param fee The pool fee tier.
 * @param tickLower The lower tick of the range.
 * @param tickUpper The upper tick of the range.
 * @param fromAddress The address to mint from.
 * @param slippage The slippage tolerance.
 * @param publicClient Viem public client.
 * @param blockNumber Optional. The block number to use for the simulation.
 * @param includeSolvers Optional. The solvers to include.
 */
export async function optimalMintV2(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>,
  feeOrTickSpacing: number,
  tickLower: number,
  tickUpper: number,
  fromAddress: Address,
  slippage: number,
  publicClient: PublicClient,
  blockNumber?: bigint,
  includeSolvers: E_Solver[] = ALL_SOLVERS,
): Promise<SolverResult[]> {
  if (!token0Amount.currency.sortsBefore(token1Amount.currency)) {
    throw new Error('token0 must be sorted before token1');
  }
  if (!blockNumber) {
    blockNumber = await publicClient.getBlockNumber();
  }
  const token0 = token0Amount.currency.address as Address;
  const token1 = token1Amount.currency.address as Address;
  const mintParams: SlipStreamMintParams | UniV3MintParams =
    amm === AutomatedMarketMakerEnum.enum.SLIPSTREAM
      ? {
          token0,
          token1,
          tickSpacing: feeOrTickSpacing,
          tickLower,
          tickUpper,
          amount0Desired: BigInt(token0Amount.quotient.toString()),
          amount1Desired: BigInt(token1Amount.quotient.toString()),
          amount0Min: 0n,
          amount1Min: 0n,
          recipient: fromAddress,
          deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
          sqrtPriceX96: 0n,
        }
      : {
          token0,
          token1,
          fee: feeOrTickSpacing,
          tickLower,
          tickUpper,
          amount0Desired: BigInt(token0Amount.quotient.toString()),
          amount1Desired: BigInt(token1Amount.quotient.toString()),
          amount0Min: 0n,
          amount1Min: 0n,
          recipient: fromAddress,
          deadline: BigInt(Math.floor(Date.now() / 1000 + 86400)),
        };

  const { poolAmountIn, zeroForOne } = await getOptimalSwapAmount(
    chainId,
    amm,
    publicClient,
    token0,
    token1,
    feeOrTickSpacing,
    tickLower,
    tickUpper,
    mintParams.amount0Desired,
    mintParams.amount1Desired,
    blockNumber,
  );

  const solve = async (solver: E_Solver) => {
    try {
      const { swapData, swapRoute } = await getSolver(solver).optimalMint({
        chainId,
        amm,
        fromAddress,
        token0,
        token1,
        feeOrTickSpacing,
        tickLower,
        tickUpper,
        slippage,
        poolAmountIn,
        zeroForOne,
      });
      const [, liquidity, amount0, amount1] = await simulateMintOptimal(
        chainId,
        amm,
        publicClient,
        fromAddress,
        mintParams,
        swapData,
        blockNumber,
      );

      const pool = await getPool(
        token0,
        token1,
        feeOrTickSpacing,
        chainId,
        amm,
        publicClient,
        blockNumber,
      );

      let gasFeeEstimation = 0n;
      try {
        const [gasPrice, gasAmount] = await Promise.all([
          publicClient.getGasPrice(),
          estimateMintOptimalGas(
            chainId,
            amm,
            publicClient,
            fromAddress,
            mintParams,
            swapData,
            blockNumber,
          ),
        ]);
        gasFeeEstimation = gasPrice * gasAmount;
      } catch (e) {
        getLogger().error('SDK.optimalMintV2.EstimateGas.Error', {
          error: JSON.stringify((e as Error).message),
          swapData,
          mintParams,
        });
      }

      return {
        solver,
        amount0,
        amount1,
        liquidity,
        swapData,
        gasFeeEstimation,
        swapRoute: getSwapRoute(
          token0,
          token1,
          amount0 - mintParams.amount0Desired,
          swapRoute,
        ),
        priceImpact: calcPriceImpact(
          pool,
          mintParams.amount0Desired,
          mintParams.amount1Desired,
          amount0,
          amount1,
        ),
        swapPath: getSwapPath(
          mintParams.token0,
          mintParams.token1,
          mintParams.amount0Desired,
          mintParams.amount1Desired,
          amount0,
          amount1,
          slippage,
        ),
      } as SolverResult;
    } catch (e) {
      if (!(e as Error)?.message.startsWith('Expected')) {
        getLogger().error('SDK.Solver.optimalMintV2.Error', {
          solver,
          error: JSON.stringify((e as Error).message),
        });
      } else {
        console.warn('SDK.Solver.optimalMintV2.Warning', solver);
      }
      return null;
    }
  };

  return buildOptimalSolutions(solve, includeSolvers);
}
