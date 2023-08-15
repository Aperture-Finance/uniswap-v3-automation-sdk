import { utils } from 'ethers';
import { CallExecutionError, Hex, PublicClient, TypedData } from 'viem';
import { TypedDataDefinition } from 'viem/src/types/typedData';

import { PermitInfo } from '../interfaces';
import { ViemSupportedChainId, getChainInfo } from './chain';
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
  chainId: ViemSupportedChainId,
  publicClient?: PublicClient,
  blockNumber?: bigint,
): Promise<PositionApprovalStatus> {
  const { aperture_uniswap_v3_automan } = getChainInfo(chainId);
  const npm = getNPM(chainId, publicClient);
  const opts = { blockNumber };
  let owner, approved;
  try {
    [owner, approved] = await Promise.all([
      npm.read.ownerOf([positionId], opts),
      npm.read.getApproved([positionId], opts),
    ]);
  } catch (error) {
    // TODO: test this
    if ((error as CallExecutionError).shortMessage === 'CALL_EXCEPTION') {
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
  if (approved == aperture_uniswap_v3_automan) {
    return {
      owner,
      hasAuthority: true,
      reason: 'onChainPositionSpecificApproval',
    };
  }
  const automanIsOperator = await npm.read.isApprovedForAll(
    [owner, aperture_uniswap_v3_automan],
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
  chainId: ViemSupportedChainId,
  publicClient?: PublicClient,
  blockNumber?: bigint,
) {
  const { aperture_uniswap_v3_automan } = getChainInfo(chainId);
  const npm = getNPM(chainId, publicClient);
  try {
    // TODO: https://github.com/wagmi-dev/viem/discussions/458
    const permitSignature = utils.splitSignature(permitInfo.signature);
    await npm.simulate.permit(
      [
        aperture_uniswap_v3_automan,
        positionId,
        BigInt(permitInfo.deadline),
        permitSignature.v,
        permitSignature.r as Hex,
        permitSignature.s as Hex,
      ],
      {
        account: aperture_uniswap_v3_automan,
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
  chainId: ViemSupportedChainId,
  positionId: bigint,
  deadlineEpochSeconds: bigint,
  publicClient?: PublicClient,
): Promise<TypedDataDefinition<typeof PermitTypes, 'Permit'>> {
  const {
    aperture_uniswap_v3_automan,
    uniswap_v3_nonfungible_position_manager,
  } = getChainInfo(chainId);
  const nonce = (
    await getNPM(chainId, publicClient).read.positions([positionId])
  )[0];
  return {
    domain: {
      name: 'Uniswap V3 Positions NFT-V1',
      version: '1',
      chainId,
      verifyingContract: uniswap_v3_nonfungible_position_manager,
    },
    types: PermitTypes,
    primaryType: 'Permit',
    message: {
      spender: aperture_uniswap_v3_automan,
      tokenId: positionId,
      nonce,
      deadline: deadlineEpochSeconds,
    },
  } as const;
}
