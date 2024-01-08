import {
  ApertureSupportedChainId,
  IERC20__factory,
  getChainInfo,
} from '@/index';
import {
  JsonRpcProvider,
  Provider,
  TransactionRequest,
} from '@ethersproject/providers';
import { AccessList } from '@ethersproject/transactions';
import { BigNumberish } from 'ethers';
import { defaultAbiCoder as DAC, keccak256 } from 'ethers/lib/utils';

export type StateOverrides = {
  [address: string]: {
    balance?: string;
    nonce?: string;
    code?: string;
    stateDiff?: {
      [slot: string]: string;
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
  owner: string,
  spender: string,
): string {
  return keccak256(
    DAC.encode(
      ['address', 'bytes32'],
      [
        spender,
        keccak256(
          DAC.encode(
            ['address', 'bytes32'],
            [owner, DAC.encode(['uint256'], [5])],
          ),
        ),
      ],
    ),
  );
}

export async function generateAccessList(
  tx: TransactionRequest,
  provider: JsonRpcProvider,
  blockNumber?: number,
): Promise<{ accessList: AccessList; gasUsed: string; gasRefund: string }> {
  try {
    return await provider.send('eth_createAccessList', [
      {
        ...tx,
        gas: '0x11E1A300',
        gasPrice: '0x0',
      },
      // hexlify the block number.
      blockNumber ? '0x' + blockNumber.toString(16) : 'latest',
    ]);
  } catch (error) {
    console.error('Error generating access list:', error);
    throw error;
  }
}

/**
 * Get the balance and allowance state overrides for a token.
 * @param token The token address.
 * @param from The sender address.
 * @param to The spender address.
 * @param amount The amount of token to set the balance and allowance to.
 * @param provider A JSON RPC provider that supports `eth_createAccessList`.
 */
export async function getERC20Overrides(
  token: string,
  from: string,
  to: string,
  amount: BigNumberish,
  provider: JsonRpcProvider,
): Promise<StateOverrides> {
  const iface = IERC20__factory.createInterface();
  const balanceOfData = iface.encodeFunctionData('balanceOf', [from]);
  const allowanceData = iface.encodeFunctionData('allowance', [from, to]);
  const [balanceOfAccessList, allowanceAccessList] = await Promise.all([
    generateAccessList(
      {
        from,
        to: token,
        data: balanceOfData,
      },
      provider,
    ),
    generateAccessList(
      {
        from,
        to: token,
        data: allowanceData,
      },
      provider,
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
  const encodedAmount = DAC.encode(['uint256'], [amount]);
  return {
    [token]: {
      stateDiff: {
        [storageKeys[0]]: encodedAmount,
        [storageKeys[1]]: encodedAmount,
      },
    },
  };
}

export function getNPMApprovalOverrides(
  chainId: ApertureSupportedChainId,
  owner: string,
): StateOverrides {
  const {
    aperture_uniswap_v3_automan,
    uniswap_v3_nonfungible_position_manager,
  } = getChainInfo(chainId);
  return {
    [uniswap_v3_nonfungible_position_manager]: {
      stateDiff: {
        [computeOperatorApprovalSlot(owner, aperture_uniswap_v3_automan)]:
          DAC.encode(['bool'], [true]),
      },
    },
  };
}

export function getAutomanWhitelistOverrides(
  chainId: ApertureSupportedChainId,
  routerToWhitelist: string,
): StateOverrides {
  return {
    [getChainInfo(chainId).aperture_uniswap_v3_automan]: {
      stateDiff: {
        [keccak256(
          DAC.encode(
            ['address', 'bytes32'],
            [routerToWhitelist, DAC.encode(['uint256'], [3])],
          ),
        )]: DAC.encode(['bool'], [true]),
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
 * Call a contract with the given state overrides.
 * @param tx The transaction request.
 * @param overrides The state overrides.
 * @param provider A JSON RPC provider that supports `eth_call` with state overrides.
 * @param blockNumber Optional block number to use for the call.
 */
export async function staticCallWithOverrides(
  tx: TransactionRequest,
  overrides: StateOverrides,
  provider: JsonRpcProvider,
  blockNumber?: number,
): Promise<string> {
  return await provider.send('eth_call', [
    tx,
    // hexlify the block number.
    blockNumber ? '0x' + blockNumber.toString(16) : 'latest',
    overrides,
  ]);
}

/**
 * Try to call a contract with the given state overrides. If the call fails, fall back to a regular call.
 * @param from The sender address.
 * @param to The contract address.
 * @param data The transaction data.
 * @param overrides The state overrides.
 * @param provider A JSON RPC provider that map support `eth_call` with state overrides.
 * @param blockNumber Optional block number to use for the call.
 */
export async function tryStaticCallWithOverrides(
  from: string,
  to: string,
  data: string,
  overrides: StateOverrides,
  provider: JsonRpcProvider | Provider,
  blockNumber?: number,
): Promise<string> {
  const tx = {
    from,
    to,
    data,
  };
  let returnData: string;
  if (provider instanceof JsonRpcProvider) {
    returnData = await staticCallWithOverrides(
      tx,
      overrides,
      provider,
      blockNumber,
    );
  } else {
    returnData = await provider.call(tx, blockNumber);
  }
  return returnData;
}
