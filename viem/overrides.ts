import {
  AccessList,
  Address,
  Hex,
  PublicClient,
  RpcTransactionRequest,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  parseAbiParameters,
  toHex,
} from 'viem';

import { ApertureSupportedChainId } from '../interfaces';
import { IERC20__factory } from '../typechain-types';
import { getChainInfo } from './chain';

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
): StateOverrides {
  const { aperture_uniswap_v3_automan, aperture_router_proxy } =
    getChainInfo(chainId);
  return {
    [aperture_uniswap_v3_automan]: {
      stateDiff: {
        [keccak256(
          encodeAbiParameters(parseAbiParameters('address, bytes32'), [
            aperture_router_proxy!,
            encodeAbiParameters(parseAbiParameters('uint256'), [3n]),
          ]),
        )]: encodeAbiParameters(parseAbiParameters('bool'), [true]),
      },
    },
  };
}

function symmetricalDifference<T>(arr1: T[], arr2: T[]): T[] {
  return [
    ...arr1.filter((item) => !arr2.includes(item)),
    ...arr2.filter((item) => !arr1.includes(item)),
  ];
}

export async function getTokenOverrides(
  chainId: ApertureSupportedChainId,
  publicClient: PublicClient,
  from: Address,
  token0: Address,
  token1: Address,
  amount0Desired: bigint,
  amount1Desired: bigint,
): Promise<StateOverrides> {
  const balanceOfData = encodeFunctionData({
    abi: IERC20__factory.abi,
    args: [from] as const,
    functionName: 'balanceOf',
  });
  const allowanceData = encodeFunctionData({
    abi: IERC20__factory.abi,
    args: [from, getChainInfo(chainId).aperture_uniswap_v3_automan] as const,
    functionName: 'allowance',
  });
  // TODO: use an ephemeral contract to get the storage keys
  const [
    token0BalanceOfAccessList,
    token0AllowanceAccessList,
    token1BalanceOfAccessList,
    token1AllowanceAccessList,
  ] = await Promise.all([
    generateAccessList(
      {
        from,
        to: token0,
        data: balanceOfData,
      },
      publicClient,
    ),
    generateAccessList(
      {
        from,
        to: token0,
        data: allowanceData,
      },
      publicClient,
    ),
    generateAccessList(
      {
        from,
        to: token1,
        data: balanceOfData,
      },
      publicClient,
    ),
    generateAccessList(
      {
        from,
        to: token1,
        data: allowanceData,
      },
      publicClient,
    ),
  ]);
  // tokens on L2 and those with a proxy will have more than one access list entry
  const filteredToken0BalanceOfAccessList = token0BalanceOfAccessList.filter(
    ({ address }) => address.toLowerCase() === token0.toLowerCase(),
  );
  const filteredToken0AllowanceAccessList = token0AllowanceAccessList.filter(
    ({ address }) => address.toLowerCase() === token0.toLowerCase(),
  );
  const filteredToken1BalanceOfAccessList = token1BalanceOfAccessList.filter(
    ({ address }) => address.toLowerCase() === token1.toLowerCase(),
  );
  const filteredToken1AllowanceAccessList = token1AllowanceAccessList.filter(
    ({ address }) => address.toLowerCase() === token1.toLowerCase(),
  );
  if (
    filteredToken0BalanceOfAccessList.length !== 1 ||
    filteredToken0AllowanceAccessList.length !== 1 ||
    filteredToken1BalanceOfAccessList.length !== 1 ||
    filteredToken1AllowanceAccessList.length !== 1
  ) {
    throw new Error('Invalid access list length');
  }
  const token0StorageKeys = symmetricalDifference(
    filteredToken0BalanceOfAccessList[0].storageKeys,
    filteredToken0AllowanceAccessList[0].storageKeys,
  );
  const token1StorageKeys = symmetricalDifference(
    filteredToken1BalanceOfAccessList[0].storageKeys,
    filteredToken1AllowanceAccessList[0].storageKeys,
  );
  if (token0StorageKeys.length !== 2 || token1StorageKeys.length !== 2) {
    throw new Error('Invalid storage key number');
  }
  const encodedAmount0Desired = encodeAbiParameters(
    parseAbiParameters('uint256'),
    [amount0Desired],
  );
  const encodedAmount1Desired = encodeAbiParameters(
    parseAbiParameters('uint256'),
    [amount1Desired],
  );
  // TODO: handle native ETH edge case
  return {
    [token0]: {
      stateDiff: {
        [token0StorageKeys[0]]: encodedAmount0Desired,
        [token0StorageKeys[1]]: encodedAmount0Desired,
      },
    },
    [token1]: {
      stateDiff: {
        [token1StorageKeys[0]]: encodedAmount1Desired,
        [token1StorageKeys[1]]: encodedAmount1Desired,
      },
    },
  };
}

export async function generateAccessList(
  tx: RpcTransactionRequest,
  publicClient: PublicClient,
  blockNumber?: bigint,
): Promise<AccessList> {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { accessList } = await publicClient.request({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      method: 'eth_createAccessList',
      params: [
        {
          ...tx,
          gas: '0x989680',
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          gasPrice: '0x0',
        },
        blockNumber ? toHex(blockNumber) : 'latest',
      ],
    });
    return accessList as AccessList;
  } catch (error) {
    console.error('Error generating access list:', error);
    throw error;
  }
}

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
