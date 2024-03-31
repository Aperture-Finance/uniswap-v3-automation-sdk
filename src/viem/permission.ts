import { ApertureSupportedChainId, PermitInfo, getChainInfoAMM } from '@/index';
import {
  CallExecutionError,
  Hex,
  PublicClient,
  TypedData,
  TypedDataDefinition,
  hexToSignature,
} from 'viem';

import { getNPM } from './position';

export interface PositionApprovalStatus {
  hasAuthority: boolean;
  owner: string;
  reason: string;
  error?: Error | unknown;
}

/**
 * Checks whether Aperture's UniV3Automan contract has authority over the specified position.
 * @param positionId Position id.
 * @param permitInfo If defined and Automan has not already been approved on-chain, this `permitInfo` will be validated as the last option.
 * @param chainId Chain id.
 * @param publicClient Viem public client.
 * @param blockNumber Optional block number to query.
 * @returns An PositionApprovalStatus object representing approval status.
 */
export async function checkPositionApprovalStatus(
  positionId: bigint,
  permitInfo: PermitInfo | undefined,
  chainId: ApertureSupportedChainId,
  publicClient?: PublicClient,
  blockNumber?: bigint,
): Promise<PositionApprovalStatus> {
  const { apertureAutoman } = getChainInfoAMM(chainId).UNISWAP;
  const npm = getNPM(chainId, publicClient);
  const opts = { blockNumber };
  let owner, approved;
  try {
    [owner, approved] = await Promise.all([
      npm.read.ownerOf([positionId], opts),
      npm.read.getApproved([positionId], opts),
    ]);
  } catch (error) {
    if (
      (error as CallExecutionError).walk().message.includes('nonexistent token')
    ) {
      return {
        owner: '',
        hasAuthority: false,
        reason: 'nonexistentPositionId',
      };
    }
    return {
      owner: '',
      hasAuthority: false,
      reason: 'unknownNPMQueryError',
    };
  }
  if (approved == apertureAutoman) {
    return {
      owner,
      hasAuthority: true,
      reason: 'onChainPositionSpecificApproval',
    };
  }
  const automanIsOperator = await npm.read.isApprovedForAll(
    [owner, apertureAutoman],
    opts,
  );
  if (automanIsOperator) {
    return {
      owner,
      hasAuthority: true,
      reason: 'onChainUserLevelApproval',
    };
  }
  if (permitInfo === undefined) {
    return {
      owner,
      hasAuthority: false,
      reason: 'missingSignedPermission',
    };
  }
  if (
    await checkPositionPermit(
      positionId,
      permitInfo,
      chainId,
      publicClient,
      blockNumber,
    )
  ) {
    return {
      owner,
      hasAuthority: true,
      reason: 'offChainPositionSpecificApproval',
    };
  } else {
    return {
      owner,
      hasAuthority: false,
      reason: 'invalidSignedPermission',
    };
  }
}

/**
 * Check if the permit is valid by calling the permit function on `NonfungiblePositionManager`.
 * @param positionId Position id.
 * @param permitInfo Permit info containing the signature and deadline.
 * @param chainId Chain id.
 * @param publicClient Viem public client.
 * @param blockNumber Optional block number to query.
 * @returns True if the permit is valid, false otherwise.
 */
export async function checkPositionPermit(
  positionId: bigint,
  permitInfo: PermitInfo,
  chainId: ApertureSupportedChainId,
  publicClient?: PublicClient,
  blockNumber?: bigint,
) {
  const { apertureAutoman } = getChainInfoAMM(chainId).UNISWAP;
  const npm = getNPM(chainId, publicClient);
  try {
    const permitSignature = hexToSignature(permitInfo.signature as Hex);
    await npm.simulate.permit(
      [
        apertureAutoman,
        positionId,
        BigInt(permitInfo.deadline),
        Number(permitSignature.v),
        permitSignature.r,
        permitSignature.s,
      ],
      {
        account: apertureAutoman,
        blockNumber,
        value: BigInt(0),
      },
    );
    return true;
  } catch (err) {
    return false;
  }
}

const PermitTypes: TypedData = {
  Permit: [
    { name: 'spender', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

/**
 * Generates typed data to be signed that allows Aperture's UniV3Automan contract to operate the specified position until the specified deadline.
 * @param chainId Chain id.
 * @param positionId Id of the position to generate permission for.
 * @param deadlineEpochSeconds The signed permission will be valid until this deadline specified in number of seconds since UNIX epoch.
 * @param publicClient Viem public client.
 * @returns An object containing typed data ready to be signed with, for example, ethers `Wallet._signTypedData(domain, types, value)`.
 */
export async function generateTypedDataForPermit(
  chainId: ApertureSupportedChainId,
  positionId: bigint,
  deadlineEpochSeconds: bigint,
  publicClient?: PublicClient,
): Promise<TypedDataDefinition<typeof PermitTypes, 'Permit'>> {
  const { apertureAutoman, nonfungiblePositionManager } =
    getChainInfoAMM(chainId).UNISWAP;
  const nonce = (
    await getNPM(chainId, publicClient).read.positions([positionId])
  )[0];
  return {
    domain: {
      name: 'Uniswap V3 Positions NFT-V1',
      version: '1',
      chainId,
      verifyingContract: nonfungiblePositionManager,
    },
    types: PermitTypes,
    primaryType: 'Permit',
    message: {
      spender: apertureAutoman,
      tokenId: positionId,
      nonce,
      deadline: deadlineEpochSeconds,
    },
  } as const;
}
