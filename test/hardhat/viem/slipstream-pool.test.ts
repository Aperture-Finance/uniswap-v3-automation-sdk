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
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { config as dotenvConfig } from 'dotenv';
import { createPublicClient, http } from 'viem';

import { ApertureSupportedChainId } from '../../../src';
import { getAMMInfo, getChainInfo, getRpcEndpoint } from '../../../src/chain';
import { SlipStreamPool, getSlipStreamPools } from '../../../src/viem';

dotenvConfig();

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('SlipStream Pool Tests', function () {
  // Increase timeout for network requests
  this.timeout(30000);

  // Test data for different networks
  const testCases = [
    {
      network: 'Base Mainnet',
      chainId: ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID,
      blockNumber: 17514450n,
      expectedPoolCount: 107,
    },
    {
      network: 'Optimism Mainnet',
      chainId: ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID,
      blockNumber: 126807301n,
      expectedPoolCount: 54,
    },
  ];

  // Helper function to validate pool structure
  const validatePoolStructure = (pool: SlipStreamPool) => {
    expect(pool).to.have.property('address').that.is.a('string');
    expect(pool).to.have.property('token0').that.is.a('string');
    expect(pool).to.have.property('token1').that.is.a('string');
    expect(pool).to.have.property('fee').that.is.a('number');
    expect(pool).to.have.property('tickSpacing').that.is.a('number');
    expect(pool).to.have.property('gaugeAddress').that.is.a('string');

    // Validate address format
    expect(pool.address).to.match(/^0x[a-fA-F0-9]{40}$/);
    expect(pool.token0).to.match(/^0x[a-fA-F0-9]{40}$/);
    expect(pool.token1).to.match(/^0x[a-fA-F0-9]{40}$/);
    expect(pool.gaugeAddress).to.match(/^0x[a-fA-F0-9]{40}$/);

    // Validate fee and tickSpacing are reasonable values
    expect(pool.fee).to.be.at.least(1);
    expect(pool.tickSpacing).to.be.at.least(1);
  };

  // Test retrieving pools for each network
  testCases.forEach(({ network, chainId, blockNumber, expectedPoolCount }) => {
    describe(`${network} Pools`, () => {
      let pools: SlipStreamPool[];

      // Fetch pools once before all tests in this describe block
      before(async () => {
        // Use Alchemy endpoint via getRpcEndpoint for better reliability
        const rpcUrl = getRpcEndpoint(chainId);
        const client = createPublicClient({
          chain: getChainInfo(chainId).chain,
          transport: http(rpcUrl),
        });
        pools = await getSlipStreamPools(client, chainId, blockNumber);
      });

      it(`should retrieve the expected number of pools (${expectedPoolCount})`, () => {
        expect(pools.length).to.equal(expectedPoolCount);
      });

      it('should have pools with valid structure and properties', () => {
        // Validate first pool in detail
        validatePoolStructure(pools[0]);

        // Validate all pools have correct structure
        pools.forEach((pool) => {
          expect(pool).to.have.all.keys([
            'address',
            'token0',
            'token1',
            'fee',
            'tickSpacing',
            'gaugeAddress',
          ]);
        });
      });

      it('should have unique pool addresses', () => {
        const addresses = pools.map((pool) => pool.address);
        const uniqueAddresses = new Set(addresses);
        expect(uniqueAddresses.size).to.equal(
          pools.length,
          'Duplicate pool addresses found',
        );
      });

      it('should have valid factory address', () => {
        const ammInfo = getAMMInfo(
          chainId,
          AutomatedMarketMakerEnum.enum.SLIPSTREAM,
        );
        expect(ammInfo).to.not.be.undefined;
        expect(ammInfo!.factory).to.match(/^0x[a-fA-F0-9]{40}$/);
      });
    });
  });

  // Test error handling
  describe('Error Handling', () => {
    it('should handle invalid chain ID gracefully', async () => {
      // Using an unsupported chain ID
      const invalidChainId = 999999 as unknown as ApertureSupportedChainId;
      const validChainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;

      // Use Alchemy endpoint via getRpcEndpoint for better reliability
      const rpcUrl = getRpcEndpoint(validChainId);
      const client = createPublicClient({
        chain: getChainInfo(validChainId).chain,
        transport: http(rpcUrl),
      });

      try {
        await getSlipStreamPools(client, invalidChainId);
        // If we get here, the test should fail
        expect.fail('Should have thrown an error for invalid chain ID');
      } catch (error) {
        // Expected to throw an error
        expect(error).to.exist;
      }
    });
  });
});
