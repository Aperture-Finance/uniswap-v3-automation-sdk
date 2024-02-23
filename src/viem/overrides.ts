import {
  ApertureSupportedChainId,
  IERC20__factory,
  getChainInfo,
} from '@/index';
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
  zeroAddress,
} from 'viem';

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

/**
 * Compute the storage slot for the isController mapping in UniV3Automan.
 * @param from The address of controller.
 * @returns The storage slot.
 */
export function computeIsControllerSlot(from: Address): Hex {
  return keccak256(
    encodeAbiParameters(parseAbiParameters('address, bytes32'), [
      from,
      encodeAbiParameters(parseAbiParameters('uint256'), [2n]),
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

export function getControllerOverrides(
  chainId: ApertureSupportedChainId,
  from: Address,
) {
  return {
    [getChainInfo(chainId).aperture_uniswap_v3_automan]: {
      stateDiff: {
        [computeIsControllerSlot(from)]: encodeAbiParameters(
          parseAbiParameters('bool'),
          [true],
        ),
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
        from: zeroAddress,
        to: token,
        data: balanceOfData,
      },
      publicClient,
    ),
    generateAccessList(
      {
        from: zeroAddress,
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
    console.error('Invalid storage key number');
  }
  const encodedAmount = encodeAbiParameters(parseAbiParameters('uint256'), [
    amount,
  ]);
  const stateDiff: {
    [key: `0x${string}`]: `0x${string}`;
  } = {};
  storageKeys.forEach((storageKey) => (stateDiff[storageKey] = encodedAmount));
  return {
    [token]: {
      stateDiff,
    },
  };
}

export type AccessListReturnType = {
  accessList: AccessList;
  gasUsed: string;
  gasRefund: string;
};

export type RpcReturnType = {
  eth_call: Hex;
  eth_estimateGas: Hex;
  eth_createAccessList: AccessListReturnType;
};

/**
 * Makes a request to the RPC endpoint with optional overrides.
 *
 * @param {string} method - The method to call on the RPC endpoint.
 * @param {RpcTransactionRequest} tx - The transaction request object.
 * @param {PublicClient} publicClient - The public client instance for making the request.
 * @param {StateOverrides} [overrides] - Optional state overrides.
 * @param {bigint} [blockNumber] - Optional block number.
 * @returns {Promise<RpcReturnType[M]>} - A promise that resolves to the result of the RPC call.
 */
export async function requestWithOverrides<M extends keyof RpcReturnType>(
  method: M,
  tx: RpcTransactionRequest,
  publicClient: PublicClient,
  overrides?: StateOverrides,
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  const blockTag = blockNumber ? toHex(blockNumber) : 'latest';
  const params = overrides ? [tx, blockTag, overrides] : [tx, blockTag];
  return await publicClient.request({
    // @ts-expect-error viem doesn't include 'eth_createAccessList'
    method,
    // @ts-expect-error viem doesn't type overrides
    params,
  });
}

/**
 * Generates an access list for the given transaction using the specified public client.
 *
 * @param {RpcTransactionRequest} tx - The transaction to generate the access list for.
 * @param {PublicClient} publicClient - The public client to use for the request.
 * @param {bigint} [blockNumber] - The block number to use for the request, optional.
 *
 * @return {Promise<AccessListReturnType>} - A promise that resolves with the generated access list.
 *
 * @throws {Error} - If an error occurs while generating the access list.
 */
export async function generateAccessList(
  tx: RpcTransactionRequest,
  publicClient: PublicClient,
  blockNumber?: bigint,
): Promise<AccessListReturnType> {
  try {
    return await requestWithOverrides(
      'eth_createAccessList',
      {
        ...tx,
        gas: '0x11E1A300',
      },
      publicClient,
      undefined,
      blockNumber,
    );
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
  return requestWithOverrides(
    'eth_call',
    tx,
    publicClient,
    overrides,
    blockNumber,
  );
}

/**
 * Estimate Gas of a contract call with the given state overrides.
 * @param tx The transaction request.
 * @param overrides The state overrides.
 * @param publicClient A JSON RPC provider that supports `eth_estimateGas` with state overrides.
 * @param blockNumber Optional block number to use for the call.
 */
export async function estimateGasWithOverrides(
  tx: RpcTransactionRequest,
  overrides: StateOverrides,
  publicClient: PublicClient,
  blockNumber?: bigint,
): Promise<bigint> {
  return hexToBigInt(
    await requestWithOverrides(
      'eth_estimateGas',
      tx,
      publicClient,
      overrides,
      blockNumber,
    ),
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
  return tryRequestWithOverrides(
    'eth_call',
    {
      from,
      to,
      data,
    },
    publicClient,
    overrides,
    blockNumber,
  );
}

/**
 * Tries to make a request with optional overrides and returns the result if successful.
 * If an error occurs, fallbacks to making the request without overrides.
 *
 * @param {string} method - The RPC method to invoke.
 * @param {RpcTransactionRequest} tx - The transaction request to include in the RPC call.
 * @param {PublicClient} publicClient - The public client to use for making the RPC call.
 * @param {StateOverrides} [overrides] - Optional overrides to include in the RPC call.
 * @param {bigint} [blockNumber] - Optional block number to include in the RPC call.
 *
 * @returns {Promise<RpcReturnType[M]>} - A promise that resolves with the RPC call result or rejects with an error.
 */
export async function tryRequestWithOverrides<M extends keyof RpcReturnType>(
  method: M,
  tx: RpcTransactionRequest,
  publicClient: PublicClient,
  overrides?: StateOverrides,
  blockNumber?: bigint,
): Promise<RpcReturnType[M]> {
  try {
    return await requestWithOverrides(
      method,
      tx,
      publicClient,
      overrides,
      blockNumber,
    );
  } catch (e) {
    const blockTag = blockNumber ? toHex(blockNumber) : 'latest';
    return await publicClient.request({
      // @ts-expect-error viem doesn't include 'eth_createAccessList'
      method,
      params: [tx, blockTag],
    });
  }
}
