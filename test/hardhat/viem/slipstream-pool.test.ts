/**
 * SlipStream Pool Tests
 *
 * These tests verify the functionality of retrieving SlipStream pools from different
 * blockchain networks and validate the structure and properties of the returned pools.
 *
 * To run these tests:
 * yarn test:hardhat test/hardhat/viem/slipstream-pool.test.ts
 */
import '@nomicfoundation/hardhat-viem';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { config as dotenvConfig } from 'dotenv';

import { ApertureSupportedChainId } from '../../../src';
import { getSlipStreamPools } from '../../../src/viem';
import { getApiClient } from '../common';

dotenvConfig();

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Slipstream pool tests', function () {
  it('getSlipStreamBasePools', async () => {
    const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;
    const client = getApiClient(chainId);
    const blockNumber = 17514450n;
    const pools = await getSlipStreamPools(client, chainId, blockNumber);
    expect(Object.keys(pools).length).to.be.equal(107);
  });
  it('getSlipStreamOptimismPools', async () => {
    const chainId = ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID;
    const client = getApiClient(chainId);
    const blockNumber = 126807301n;
    const pools = await getSlipStreamPools(client, chainId, blockNumber);
    expect(Object.keys(pools).length).to.be.equal(54);
  });
});
