import {
  AccessList,
  Address,
  Hex,
  PublicClient,
  RpcTransactionRequest,
  encodeAbiParameters,
  encodeFunctionData,
  hexToBigInt,
  keccak256,
  parseAbiParameters,
  toHex,
} from 'viem';

import { getChainInfo } from '../chain';
import { ApertureSupportedChainId } from '../interfaces';
import { IERC20__factory } from '../typechain-types';

type StateOverrides = {
  [address: Address]: {
    balance?: Hex;
    nonce?: Hex;
    code?: Hex;
    stateDiff?: {
      [slot: Hex]: Hex;
    };
  };
};

/**
 * Compute the storage slot for the operator approval in NonfungiblePositionManager.
 * @param owner The owner of the position.
 * @param spender The spender of the position.
 * @returns The storage slot.
 */
export function computeOperatorApprovalSlot(
  owner: Address,
  spender: Address,
): Hex {
  return keccak256(
    encodeAbiParameters(parseAbiParameters('address, bytes32'), [
      spender,
      keccak256(
        encodeAbiParameters(parseAbiParameters('address, bytes32'), [
          owner,
          encodeAbiParameters(parseAbiParameters('uint256'), [5n]),
        ]),
      ),
    ]),
  );
}

export function getNPMApprovalOverrides(
  chainId: ApertureSupportedChainId,
  owner: Address,
): StateOverrides {
  const {
    aperture_uniswap_v3_automan,
    uniswap_v3_nonfungible_position_manager,
  } = getChainInfo(chainId);
  return {
    [uniswap_v3_nonfungible_position_manager]: {
      stateDiff: {
        [computeOperatorApprovalSlot(owner, aperture_uniswap_v3_automan)]:
          encodeAbiParameters(parseAbiParameters('bool'), [true]),
      },
    },
  };
}

export function getAutomanWhitelistOverrides(
  chainId: ApertureSupportedChainId,
  routerToWhitelist: Address,
): StateOverrides {
  return {
    [getChainInfo(chainId).aperture_uniswap_v3_automan]: {
      stateDiff: {
        [keccak256(
          encodeAbiParameters(parseAbiParameters('address, bytes32'), [
            routerToWhitelist,
            encodeAbiParameters(parseAbiParameters('uint256'), [3n]),
          ]),
        )]: encodeAbiParameters(parseAbiParameters('bool'), [true]),
      },
    },
  };
}

function symmetricDifference<T>(arr1: T[], arr2: T[]): T[] {
  return [
    ...arr1.filter((item) => !arr2.includes(item)),
    ...arr2.filter((item) => !arr1.includes(item)),
  ];
}

/**
 * Get the balance and allowance state overrides for a token.
 * @param token The token address.
 * @param from The sender address.
 * @param to The spender address.
 * @param amount The amount of token to set the balance and allowance to.
 * @param publicClient A JSON RPC provider that supports `eth_createAccessList`.
 */
export async function getERC20Overrides(
  token: Address,
  from: Address,
  to: Address,
  amount: bigint,
  publicClient: PublicClient,
): Promise<StateOverrides> {
  const balanceOfData = encodeFunctionData({
    abi: IERC20__factory.abi,
    args: [from] as const,
    functionName: 'balanceOf',
  });
  const allowanceData = encodeFunctionData({
    abi: IERC20__factory.abi,
    args: [from, to] as const,
    functionName: 'allowance',
  });
  const [balanceOfAccessList, allowanceAccessList] = await Promise.all([
    generateAccessList(
      {
        from,
        to: token,
        data: balanceOfData,
      },
      publicClient,
    ),
    generateAccessList(
      {
        from,
        to: token,
        data: allowanceData,
      },
      publicClient,
    ),
  ]);
  // tokens on L2 and those with a proxy will have more than one access list entry
  const filteredBalanceOfAccessList = balanceOfAccessList.accessList.filter(
    ({ address }) => address.toLowerCase() === token.toLowerCase(),
  );
  const filteredAllowanceAccessList = allowanceAccessList.accessList.filter(
    ({ address }) => address.toLowerCase() === token.toLowerCase(),
  );
  if (
    filteredBalanceOfAccessList.length !== 1 ||
    filteredAllowanceAccessList.length !== 1
  ) {
    throw new Error('Invalid access list length');
  }
  // get rid of the storage key of implementation address
  const storageKeys = symmetricDifference(
    filteredBalanceOfAccessList[0].storageKeys,
    filteredAllowanceAccessList[0].storageKeys,
  );
  if (storageKeys.length !== 2) {
    throw new Error('Invalid storage key number');
  }
  const encodedAmount = encodeAbiParameters(parseAbiParameters('uint256'), [
    amount,
  ]);
  return {
    [token]: {
      stateDiff: {
        [storageKeys[0]]: encodedAmount,
        [storageKeys[1]]: encodedAmount,
      },
    },
  };
}

export async function generateAccessList(
  tx: RpcTransactionRequest,
  publicClient: PublicClient,
  blockNumber?: bigint,
): Promise<{ accessList: AccessList; gasUsed: string; gasRefund: string }> {
  try {
    return await publicClient.request({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      method: 'eth_createAccessList',
      params: [
        {
          ...tx,
          gas: '0x11E1A300',
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          gasPrice: '0x0',
        },
        blockNumber ? toHex(blockNumber) : 'latest',
      ],
    });
  } catch (error) {
    console.error('Error generating access list:', error);
    throw error;
  }
}

/**
 * Call a contract with the given state overrides.
 * @param tx The transaction request.
 * @param overrides The state overrides.
 * @param publicClient A JSON RPC provider that supports `eth_call` with state overrides.
 * @param blockNumber Optional block number to use for the call.
 */
export async function staticCallWithOverrides(
  tx: RpcTransactionRequest,
  overrides: StateOverrides,
  publicClient: PublicClient,
  blockNumber?: bigint,
): Promise<Hex> {
  return (await publicClient.request({
    method: 'eth_call',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    params: [tx, blockNumber ? toHex(blockNumber) : 'latest', overrides],
  })) as Hex;
}

/**
 * Estimate Gas of a contract call with the given state overrides.
 * @param tx The transaction request.
 * @param overrides The state overrides.
 * @param publicClient A JSON RPC provider that supports `eth_estimateGas` with state overrides.
 * @param blockNumber Optional block number to use for the call.
 */
export async function estimateGasWithOverrides(
  from: Address,
  to: Address,
  data: Hex,
  overrides: StateOverrides,
  publicClient: PublicClient,
  blockNumber?: bigint,
): Promise<bigint> {
  const tx = {
    from,
    to,
    data,
  };
  return hexToBigInt(
    (await publicClient.request({
      method: 'eth_estimateGas',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      params: [tx, blockNumber ? toHex(blockNumber) : 'latest', overrides],
    })) as Hex,
  );
}

/**
 * Try to call a contract with the given state overrides. If the call fails, fall back to a regular call.
 * @param from The sender address.
 * @param to The contract address.
 * @param data The transaction data.
 * @param overrides The state overrides.
 * @param publicClient A JSON RPC provider that map support `eth_call` with state overrides.
 * @param blockNumber Optional block number to use for the call.
 */
export async function tryStaticCallWithOverrides(
  from: Address,
  to: Address,
  data: Hex,
  overrides: StateOverrides,
  publicClient: PublicClient,
  blockNumber?: bigint,
): Promise<Hex> {
  const tx = {
    from,
    to,
    data,
  };
  let returnData: Hex;
  try {
    returnData = await staticCallWithOverrides(
      tx,
      overrides,
      publicClient,
      blockNumber,
    );
  } catch (e) {
    returnData = (
      await publicClient.call({
        account: from,
        data: tx.data,
        to: tx.to,
        blockNumber,
      })
    ).data!;
  }
  return returnData;
}
