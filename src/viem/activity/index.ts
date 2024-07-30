// Adapted from https://github.com/Uniswap/interface/blob/main/src/components/AccountDrawer/MiniPortfolio/Activity/parseRemote.tsx.
import {
  ActivityType,
  AssetActivityPartsFragment,
  Chain,
  NftApprovalPartsFragment,
  NftApproveForAllPartsFragment,
  NftTransferPartsFragment,
  TokenApprovalPartsFragment,
  TokenTransferPartsFragment,
  TransactionStatus,
} from '@/data/__graphql_generated__/uniswap-data-types-and-hooks';
import { NumberType, formatNumberOrString } from '@/uniswap-conedison/format';
import {
  NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
  UniswapSupportedChainId,
  nativeOnChain,
} from '@/uniswap-constants';
import { Currency } from '@uniswap/sdk-core';
import axios from 'axios';
import { getAddress } from 'viem';

export type TransactionReceipt = AssetActivityPartsFragment['transaction'];

export type Activity = {
  hash: string;
  chainId: UniswapSupportedChainId;
  status: TransactionStatus;
  timestamp: number;
  title: string;
  descriptor?: string;
  logos?: Array<string | undefined>;
  currencies?: Array<Currency | undefined>;
  otherAccount?: string;
  receipt?: Omit<TransactionReceipt, 'nonce'>;
  nonce?: number | null;
};

export type TransactionFragments = {
  NftTransfer: NftTransferPartsFragment[];
  TokenTransfer: TokenTransferPartsFragment[];
  TokenApproval: TokenApprovalPartsFragment[];
  NftApproval: NftApprovalPartsFragment[];
  NftApproveForAll: NftApproveForAllPartsFragment[];
};

type ActivityTypeParser = (
  changes: TransactionFragments,
  assetActivity: AssetActivityPartsFragment,
) => Partial<Activity>;
const ActivityParserByType: { [key: string]: ActivityTypeParser | undefined } =
  {
    [ActivityType.Swap]: parseSwap,
    [ActivityType.Approve]: parseApprove,
    [ActivityType.Send]: parseSendReceive,
    [ActivityType.Receive]: parseSendReceive,
    [ActivityType.Mint]: parseMint,
    [ActivityType.Unknown]: parseUnknown,
  };

const GRAPHQL_CHAIN_NAME_TO_CHAIN_ID: {
  [key in Chain]: UniswapSupportedChainId;
} = {
  [Chain.Ethereum]: UniswapSupportedChainId.MAINNET,
  [Chain.EthereumGoerli]: UniswapSupportedChainId.GOERLI,
  [Chain.Polygon]: UniswapSupportedChainId.POLYGON,
  [Chain.Celo]: UniswapSupportedChainId.CELO,
  [Chain.Optimism]: UniswapSupportedChainId.OPTIMISM,
  [Chain.Arbitrum]: UniswapSupportedChainId.ARBITRUM_ONE,
  [Chain.UnknownChain]: UniswapSupportedChainId.MAINNET,
  [Chain.Bnb]: UniswapSupportedChainId.BNB,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAddress(value: any): string | false {
  try {
    // Alphabetical letters must be made lowercase for getAddress to work.
    return getAddress(value.toLowerCase());
  } catch {
    return false;
  }
}

function isSameAddress(a?: string, b?: string) {
  return a === b || a?.toLowerCase() === b?.toLowerCase(); // Lazy-lowercases the addresses
}

function callsPositionManagerContract(
  assetActivity: AssetActivityPartsFragment,
) {
  return isSameAddress(
    assetActivity.transaction.to,
    NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[
      GRAPHQL_CHAIN_NAME_TO_CHAIN_ID[assetActivity.chain]
    ],
  );
}

// Gets counts for number of NFTs in each collection present.
function getCollectionCounts(nftTransfers: NftTransferPartsFragment[]): {
  [key: string]: number | undefined;
} {
  return nftTransfers.reduce(
    (acc, NFTChange) => {
      const key = NFTChange.asset.collection?.name ?? NFTChange.asset.name;
      if (key) {
        acc[key] = (acc?.[key] ?? 0) + 1;
      }
      return acc;
    },
    {} as { [key: string]: number | undefined },
  );
}

function getSwapTitle(
  sent: TokenTransferPartsFragment,
  received: TokenTransferPartsFragment,
) {
  if (
    sent.tokenStandard === 'NATIVE' &&
    isSameAddress(
      nativeOnChain(GRAPHQL_CHAIN_NAME_TO_CHAIN_ID[sent.asset.chain]).wrapped
        .address,
      received.asset.address,
    )
  )
    return `Wrapped`;
  else if (
    received.tokenStandard === 'NATIVE' &&
    isSameAddress(
      nativeOnChain(GRAPHQL_CHAIN_NAME_TO_CHAIN_ID[received.asset.chain])
        .wrapped.address,
      received.asset.address,
    )
  ) {
    return `Unwrapped`;
  } else {
    return `Swapped`;
  }
}

function parseSwap(changes: TransactionFragments) {
  if (changes.NftTransfer.length > 0 && changes.TokenTransfer.length === 1) {
    const collectionCounts = getCollectionCounts(changes.NftTransfer);

    const title = changes.NftTransfer[0].direction === 'IN' ? `Bought` : `Sold`;
    const descriptor = Object.entries(collectionCounts)
      .map(([collectionName, count]) => `${count} ${collectionName}`)
      .join();

    return { title, descriptor };
  } else if (changes.TokenTransfer.length === 2) {
    const sent = changes.TokenTransfer.find(
      (t) => t?.__typename === 'TokenTransfer' && t.direction === 'OUT',
    );
    const received = changes.TokenTransfer.find(
      (t) => t?.__typename === 'TokenTransfer' && t.direction === 'IN',
    );
    if (sent && received) {
      const inputAmount = formatNumberOrString(
        sent.quantity,
        NumberType.TokenNonTx,
      );
      const outputAmount = formatNumberOrString(
        received.quantity,
        NumberType.TokenNonTx,
      );
      return {
        title: getSwapTitle(sent, received),
        descriptor: `${inputAmount} ${sent.asset.symbol} for ${outputAmount} ${received.asset.symbol}`,
      };
    }
  }
  return { title: `Unknown Swap` };
}

function parseApprove(changes: TransactionFragments) {
  if (changes.TokenApproval.length === 1) {
    const title =
      parseInt(changes.TokenApproval[0].quantity) === 0
        ? `Revoked Approval`
        : `Approved`;
    const descriptor = `${changes.TokenApproval[0].asset.symbol}`;
    return { title, descriptor };
  }
  return { title: `Unknown Approval` };
}

function parseLPTransfers(changes: TransactionFragments) {
  const poolTokenA = changes.TokenTransfer[0];
  const poolTokenB = changes.TokenTransfer[1];

  const tokenAQuantity = formatNumberOrString(
    poolTokenA.quantity,
    NumberType.TokenNonTx,
  );
  const tokenBQuantity = formatNumberOrString(
    poolTokenB.quantity,
    NumberType.TokenNonTx,
  );

  return {
    descriptor: `${tokenAQuantity} ${poolTokenA.asset.symbol} and ${tokenBQuantity} ${poolTokenB.asset.symbol}`,
    logos: [
      poolTokenA.asset.project?.logo?.url,
      poolTokenB.asset.project?.logo?.url,
    ],
  };
}

function parseSendReceive(
  changes: TransactionFragments,
  assetActivity: AssetActivityPartsFragment,
) {
  // Aperture note: This TODO is from Uniswap frontend repo.
  // TODO(cartcrom): remove edge cases after backend implements
  // Edge case: Receiving two token transfers in interaction w/ V3 manager === removing liquidity. These edge cases should potentially be moved to backend
  if (
    changes.TokenTransfer.length === 2 &&
    callsPositionManagerContract(assetActivity)
  ) {
    return { title: `Removed Liquidity`, ...parseLPTransfers(changes) };
  }

  let transfer:
    | NftTransferPartsFragment
    | TokenTransferPartsFragment
    | undefined;
  let assetName: string | undefined;
  let amount: string | undefined;

  if (changes.NftTransfer.length === 1) {
    transfer = changes.NftTransfer[0];
    assetName = transfer.asset.collection?.name;
    amount = '1';
  } else if (changes.TokenTransfer.length === 1) {
    transfer = changes.TokenTransfer[0];
    assetName = transfer.asset.symbol;
    amount = formatNumberOrString(transfer.quantity, NumberType.TokenNonTx);
  }

  if (transfer && assetName && amount) {
    return transfer.direction === 'IN'
      ? {
          title: `Received`,
          descriptor: `${amount} ${assetName} from `,
          otherAccount: isAddress(transfer.sender) || undefined,
        }
      : {
          title: `Sent`,
          descriptor: `${amount} ${assetName} to `,
          otherAccount: isAddress(transfer.recipient) || undefined,
        };
  }
  return { title: `Unknown Send` };
}

function parseMint(
  changes: TransactionFragments,
  assetActivity: AssetActivityPartsFragment,
) {
  const collectionMap = getCollectionCounts(changes.NftTransfer);
  if (Object.keys(collectionMap).length === 1) {
    const collectionName = Object.keys(collectionMap)[0];

    // Edge case: Minting a v3 position represents adding liquidity
    if (
      changes.TokenTransfer.length === 2 &&
      callsPositionManagerContract(assetActivity)
    ) {
      return { title: `Added Liquidity`, ...parseLPTransfers(changes) };
    }
    return {
      title: `Minted`,
      descriptor: `${collectionMap[collectionName]} ${collectionName}`,
    };
  }
  return { title: `Unknown Mint` };
}

const UNI_IMG =
  'https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png';

const ENS_IMG =
  'https://464911102-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/collections%2F2TjMAeHSzwlQgcOdL48E%2Ficon%2FKWP0gk2C6bdRPliWIA6o%2Fens%20transparent%20background.png?alt=media&token=bd28b063-5a75-4971-890c-97becea09076';

const COMMON_CONTRACTS: { [key: string]: Partial<Activity> | undefined } = {
  ['0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'.toLowerCase()]: {
    title: `UNI Governance`,
    descriptor: `Contract Interaction`,
    logos: [UNI_IMG],
  },
  '0x000000000022d473030f116ddee9f6b43ac78ba3': {
    title: `Permit2`,
    descriptor: `Uniswap Protocol`,
    logos: [UNI_IMG],
  },
  '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41': {
    title: `Ethereum Name Service`,
    descriptor: `Public Resolver`,
    logos: [ENS_IMG],
  },
  '0x58774bb8acd458a640af0b88238369a167546ef2': {
    title: `Ethereum Name Service`,
    descriptor: `DNS Registrar`,
    logos: [ENS_IMG],
  },
  '0x084b1c3c81545d370f3634392de611caabff8148': {
    title: `Ethereum Name Service`,
    descriptor: `Reverse Registrar`,
    logos: [ENS_IMG],
  },
  '0x283af0b28c62c092c9727f1ee09c02ca627eb7f5': {
    title: `Ethereum Name Service`,
    descriptor: `ETH Registrar Controller`,
    logos: [ENS_IMG],
  },
};

function parseUnknown(
  _changes: TransactionFragments,
  assetActivity: AssetActivityPartsFragment,
) {
  return {
    title: `Contract Interaction`,
    ...COMMON_CONTRACTS[assetActivity.transaction.to.toLowerCase()],
  };
}

function getLogoSrcs(changes: TransactionFragments): string[] {
  // Uses set to avoid duplicate logos (e.g. NFTs w/ same image url)
  const logoSet = new Set<string | undefined>();
  // Uses only NFT logos if they are present (will not combine nft image w/ token image)
  if (changes.NftTransfer.length > 0) {
    changes.NftTransfer.forEach((nftChange) =>
      logoSet.add(nftChange.asset.image?.url),
    );
  } else {
    changes.TokenTransfer.forEach((tokenChange) =>
      logoSet.add(tokenChange.asset.project?.logo?.url),
    );
    changes.TokenApproval.forEach((tokenChange) =>
      logoSet.add(tokenChange.asset.project?.logo?.url),
    );
  }
  return Array.from(logoSet).filter(Boolean) as string[];
}

function parseActivity(
  assetActivity: AssetActivityPartsFragment,
): Activity | undefined {
  try {
    const changes = assetActivity.assetChanges.reduce(
      (acc: TransactionFragments, assetChange) => {
        if (assetChange.__typename === 'NftApproval')
          acc.NftApproval.push(assetChange);
        else if (assetChange.__typename === 'NftApproveForAll')
          acc.NftApproveForAll.push(assetChange);
        else if (assetChange.__typename === 'NftTransfer')
          acc.NftTransfer.push(assetChange);
        else if (assetChange.__typename === 'TokenTransfer')
          acc.TokenTransfer.push(assetChange);
        else if (assetChange.__typename === 'TokenApproval')
          acc.TokenApproval.push(assetChange);

        return acc;
      },
      {
        NftTransfer: [],
        TokenTransfer: [],
        TokenApproval: [],
        NftApproval: [],
        NftApproveForAll: [],
      },
    );
    const defaultFields = {
      hash: assetActivity.transaction.hash,
      chainId: GRAPHQL_CHAIN_NAME_TO_CHAIN_ID[assetActivity.chain],
      status: assetActivity.transaction.status,
      timestamp: assetActivity.timestamp,
      logos: getLogoSrcs(changes),
      title: assetActivity.type,
      descriptor: assetActivity.transaction.to,
      receipt: assetActivity.transaction,
      nonce: assetActivity.transaction.nonce,
    };
    const parsedFields = ActivityParserByType[assetActivity.type]?.(
      changes,
      assetActivity,
    );

    return { ...defaultFields, ...parsedFields };
  } catch (e) {
    console.error('Failed to parse activity', e, assetActivity);
    return undefined;
  }
}

// TODO: Uniswap subgraph returns null `assetActivities` as of 7/25/2023. Consider removing the entire activity.ts file and the associated graphql files under `data/`.
/**
 * Fetches wallet activities for the specified address. Activities include ERC-20 and NFT token transfers, approvals, and Uniswap trades and liquidity management.
 * @param address The wallet address to fetch activities for.
 * @param pageSize Pagination param, size of a page. Default: 50.
 * @param pageNumber Pagination param, which page to request, starting from 1. Default: 1.
 * @param userAgent Optional user agent to use for the request. Default: undefined. This only needs to be set in Node unit tests.
 */
export async function getWalletActivities(
  address: string,
  pageSize = 50,
  pageNumber = 1,
  userAgent?: string,
) {
  const assetActivities: AssetActivityPartsFragment[] | undefined = (
    await axios.post(
      'https://uniswap-api.aperture.finance/v1/graphql',
      {
        operationName: 'TransactionList',
        variables: {
          account: address,
        },
        query: `
            query TransactionList($account: String!) {
                portfolios(ownerAddresses: [$account]) {
                  id
                  assetActivities(pageSize: ${pageSize}, page: ${pageNumber}) {
                    ...AssetActivityParts
                    __typename
                  }
                  __typename
                }
              }
              
              fragment AssetActivityParts on AssetActivity {
                id
                timestamp
                type
                chain
                transaction {
                  ...TransactionParts
                  __typename
                }
                assetChanges {
                  __typename
                  ... on TokenTransfer {
                    ...TokenTransferParts
                    __typename
                  }
                  ... on NftTransfer {
                    ...NFTTransferParts
                    __typename
                  }
                  ... on TokenApproval {
                    ...TokenApprovalParts
                    __typename
                  }
                  ... on NftApproval {
                    ...NFTApprovalParts
                    __typename
                  }
                  ... on NftApproveForAll {
                    ...NFTApproveForAllParts
                    __typename
                  }
                }
                __typename
              }
              
              fragment TransactionParts on Transaction {
                id
                blockNumber
                hash
                status
                to
                from
                __typename
              }
              
              fragment TokenTransferParts on TokenTransfer {
                id
                asset {
                  ...TokenAssetParts
                  __typename
                }
                tokenStandard
                quantity
                sender
                recipient
                direction
                transactedValue {
                  id
                  currency
                  value
                  __typename
                }
                __typename
              }
              
              fragment TokenAssetParts on Token {
                id
                name
                symbol
                address
                decimals
                chain
                standard
                project {
                  id
                  isSpam
                  logo {
                    id
                    url
                    __typename
                  }
                  __typename
                }
                __typename
              }
              
              fragment NFTTransferParts on NftTransfer {
                id
                asset {
                  ...NFTAssetParts
                  __typename
                }
                nftStandard
                sender
                recipient
                direction
                __typename
              }
              
              fragment NFTAssetParts on NftAsset {
                id
                name
                nftContract {
                  id
                  chain
                  address
                  __typename
                }
                tokenId
                image {
                  id
                  url
                  __typename
                }
                collection {
                  id
                  name
                  __typename
                }
                __typename
              }
              
              fragment TokenApprovalParts on TokenApproval {
                id
                asset {
                  ...TokenAssetParts
                  __typename
                }
                tokenStandard
                approvedAddress
                quantity
                __typename
              }
              
              fragment NFTApprovalParts on NftApproval {
                id
                asset {
                  ...NFTAssetParts
                  __typename
                }
                nftStandard
                approvedAddress
                __typename
              }
              
              fragment NFTApproveForAllParts on NftApproveForAll {
                id
                asset {
                  ...NFTAssetParts
                  __typename
                }
                nftStandard
                operatorAddress
                approved
                __typename
              }
            `,
      },
      {
        headers: {
          'User-Agent': userAgent,
        },
      },
    )
  ).data.data?.portfolios?.[0].assetActivities;
  return assetActivities?.reduce(
    (acc: { [hash: string]: Activity }, assetActivity) => {
      const activity = parseActivity(assetActivity);
      if (activity) acc[activity.hash] = activity;
      return acc;
    },
    {},
  );
}
