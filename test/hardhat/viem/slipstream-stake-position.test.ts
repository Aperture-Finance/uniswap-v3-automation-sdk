/**
 * SlipStream Stake Position Tests
 *
 * These tests verify the functionality of retrieving SlipStream stake positions from different
 * blockchain networks and validate the structure and properties of the returned positions.
 *
 * To run these tests:
 * yarn test:hardhat test/hardhat/viem/slipstream-stake-position.test.ts
 */
import '@nomicfoundation/hardhat-viem';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { config as dotenvConfig } from 'dotenv';

import { ApertureSupportedChainId } from '../../../src';
import { getSlipStreamStakePositions } from '../../../src/viem';
import { getApiClient } from '../common';

dotenvConfig();

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Slipstream stake position tests', function () {
  it('getSlipStreamBaseStakePositions', async () => {
    const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;
    const client = getApiClient(chainId);
    const blockNumber = 19669550n;
    const stakedPositions = await getSlipStreamStakePositions(
      '0xdC333239245ebBC6B656Ace7c08099AA415585d1',
      chainId,
      client,
      undefined,
      blockNumber,
    );
    expect(stakedPositions.length).to.be.equal(1);
  });
  it('getSlipStreamOptimismStakePositions', async () => {
    const chainId = ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID;
    const client = getApiClient(chainId);
    const blockNumber = 126810142n;
    const stakedPositions = await getSlipStreamStakePositions(
      '0xdC333239245ebBC6B656Ace7c08099AA415585d1',
      chainId,
      client,
      undefined,
      blockNumber,
    );
    expect(stakedPositions.length).to.be.equal(1);
  });
});
