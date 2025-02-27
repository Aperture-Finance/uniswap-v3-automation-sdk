import { ApertureSupportedChainId, getAMMInfo } from '@/index';
import axios from 'axios';
import { Address, Hex } from 'viem';

import { encodeOptimalSwapData } from '../automan';
import { limiter } from './common';
import { ISolver } from './types';

type BlockChains = 'ethereum';
const blockChainMap: Partial<Record<ApertureSupportedChainId, BlockChains>> = {
  [ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID]: 'ethereum',
};

// reference: https://docs.propellerheads.xyz/propellerheads-docs/api/api-overview/target-contracts
const APPROVE_TARGET = '0x14f2b6ca0324cd2B013aD02a7D85541d215e2906';

export const getPropellerHeadsSolver = (): ISolver => {
  return {
    solve: async (props) => {
      const {
        chainId,
        amm,
        token0,
        token1,
        feeOrTickSpacing,
        tickLower,
        tickUpper,
        slippage,
        poolAmountIn,
        zeroForOne,
      } = props;

      if (chainId !== ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID) {
        throw new Error('Expected: Chain not supported');
      }

      const ammInfo = getAMMInfo(chainId, amm)!;
      // get a quote from PH
      const res = await quote(
        blockChainMap[chainId]!,
        zeroForOne ? token0 : token1,
        zeroForOne ? token1 : token0,
        poolAmountIn.toString(),
        ammInfo.optimalSwapRouter!,
        slippage,
      );

      const { solutions } = res;
      if (solutions.length === 0) {
        throw new Error('Got no solution');
      }

      return {
        toAmount: solutions[0].orders.reduce(
          (acc, order) => acc + BigInt(order.executed_buy_amount),
          BigInt(0),
        ),
        swapData: encodeOptimalSwapData(
          chainId,
          amm,
          token0,
          token1,
          feeOrTickSpacing,
          tickLower,
          tickUpper,
          zeroForOne,
          APPROVE_TARGET,
          solutions[0].target_address,
          solutions[0].call_data,
        ),
      };
    },
  };
};

/**
 * Get a quote for a swap with PropellerHeads
 * @param blockchain chain name.
 * @param src Contract address of a token to sell
 * @param dst Contract address of a token to buy
 * @param amount Amount of a token to sell, set in minimal divisible units
 * @param from Address of a seller, make sure that this address has approved to spend src in needed amount
 * @param slippage Represents the percentage of acceptable difference between the expected price of an order and the price when the order actually executes. The default value is 0.0005.
 */
async function quote(
  blockchain: BlockChains,
  src: string,
  dst: string,
  amount: string,
  from: string,
  slippage: number,
): Promise<{
  solutions: Array<{
    call_data: Hex;
    gas: string; // not care currently
    target_address: Address;
    orders: Array<{
      sell_amount: string;
      executed_sell_amount: string;
      buy_amount: string;
      executed_buy_amount: string;
    }>; // not care currently
  }>;
}> {
  if (amount === '0') {
    throw new Error('amount should greater than 0');
  }

  const data = {
    blockchain,
    amms: ['+all'],
    slippage: slippage.toString(),
    return_routes: false, // TODO: handle later
    orders: [
      {
        origin_address: from,
        sell_token: src,
        buy_token: dst,
        sell_amount: amount,
      },
    ],
  };
  return (await buildRequest(data)).data;
}

const endpoint = 'https://ph-api.aperture.finance/partner';
const path = '/v2/solver/solve';

const buildRequest = async (data: object) => {
  return limiter.schedule(() =>
    axios.post(`${endpoint}${path}`, data, {
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
    }),
  );
};
