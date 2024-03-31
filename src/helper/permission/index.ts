import { ApertureSupportedChainId, PermitInfo, getChainInfoAMM } from '@/index';
import { Provider } from '@ethersproject/abstract-provider';
import { BigNumberish, TypedDataDomain, TypedDataField, ethers } from 'ethers';

import { getNPM } from '../position';

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
 * @param provider Ethers provider.
 * @returns An PositionApprovalStatus object representing approval status.
 */
export async function checkPositionApprovalStatus(
  positionId: BigNumberish,
  permitInfo: PermitInfo | undefined,
  chainId: ApertureSupportedChainId,
  provider: ethers.providers.Provider,
): Promise<PositionApprovalStatus> {
  const chainInfo = getChainInfoAMM(chainId);
  const npm = getNPM(chainId, provider);
  let owner, approved;
  try {
    [owner, approved] = await Promise.all([
      npm.ownerOf(positionId),
      npm.getApproved(positionId),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err.code === 'CALL_EXCEPTION') {
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
  if (approved == chainInfo.UNISWAP.apertureAutoman) {
    return {
      owner,
      hasAuthority: true,
      reason: 'onChainPositionSpecificApproval',
    };
  }
  const automanIsOperator = await npm.isApprovedForAll(
    owner,
    chainInfo.UNISWAP.apertureAutoman,
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
  if (await checkPositionPermit(positionId, permitInfo, chainId, provider)) {
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
 * @param provider Ethers provider.
 * @returns True if the permit is valid, false otherwise.
 */
export async function checkPositionPermit(
  positionId: BigNumberish,
  permitInfo: PermitInfo,
  chainId: ApertureSupportedChainId,
  provider: ethers.providers.Provider,
) {
  const chainInfo = getChainInfoAMM(chainId);
  const npm = getNPM(chainId, provider);
  try {
    const permitSignature = ethers.utils.splitSignature(permitInfo.signature);
    await npm.callStatic.permit(
      chainInfo.UNISWAP.apertureAutoman,
      positionId,
      permitInfo.deadline,
      permitSignature.v,
      permitSignature.r,
      permitSignature.s,
    );
    return true;
  } catch (err) {
    console.log(`npm.callStatic.permit() failed: ${err}`);
    return false;
  }
}

/**
 * Generates typed data to be signed that allows Aperture's UniV3Automan contract to operate the specified position until the specified deadline.
 * @param chainId Chain id.
 * @param positionId Id of the position to generate permission for.
 * @param deadlineEpochSeconds The signed permission will be valid until this deadline specified in number of seconds since UNIX epoch.
 * @param provider Ethers provider.
 * @returns An object containing typed data ready to be signed with, for example, ethers `Wallet._signTypedData(domain, types, value)`.
 */
export async function generateTypedDataForPermit(
  chainId: ApertureSupportedChainId,
  positionId: BigNumberish,
  deadlineEpochSeconds: BigNumberish,
  provider: Provider,
): Promise<{
  domain: TypedDataDomain;
  types: Record<string, Array<TypedDataField>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Record<string, any>;
}> {
  const ammInfo = getChainInfoAMM(chainId).UNISWAP;
  return {
    domain: {
      name: 'Uniswap V3 Positions NFT-V1',
      version: '1',
      chainId,
      verifyingContract: ammInfo.nonfungiblePositionManager,
    },
    types: {
      Permit: [
        { name: 'spender', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    value: {
      spender: ammInfo.apertureAutoman,
      tokenId: positionId,
      nonce: (await getNPM(chainId, provider).positions(positionId)).nonce,
      deadline: deadlineEpochSeconds,
    },
  };
}
