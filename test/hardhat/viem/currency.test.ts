import hre from 'hardhat';
import { PublicClient, TestClient } from 'viem';

import { ApertureSupportedChainId } from '../../../src';
import { getBulkTokens, getToken } from '../../../src/viem';
import { WBTC_ADDRESS, WETH_ADDRESS, expect, resetFork } from '../common';

describe('Viem - Currency tests', function () {
  let publicClient: PublicClient;
  let testClient: TestClient;
  const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;

  before(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient, 17188000n);
  });

  describe('getToken', () => {
    it('fetches token info with symbol and name', async function () {
      const wbtc = await getToken(
        WBTC_ADDRESS,
        chainId,
        publicClient,
        undefined,
        true,
      );

      expect(wbtc.decimals).to.equal(8);
      expect(wbtc.symbol).to.equal('WBTC');
      expect(wbtc.name).to.equal('Wrapped BTC');

      const weth = await getToken(
        WETH_ADDRESS,
        chainId,
        publicClient,
        undefined,
        true,
      );

      expect(weth.decimals).to.equal(18);
      expect(weth.symbol).to.equal('WETH');
      expect(weth.name).to.equal('Wrapped Ether');
    });

    it('fetches token info with decimals only', async function () {
      const wbtc = await getToken(WBTC_ADDRESS, chainId, publicClient);

      expect(wbtc.decimals).to.equal(8);
      expect(wbtc.symbol).to.be.undefined;
      expect(wbtc.name).to.be.undefined;

      const weth = await getToken(WETH_ADDRESS, chainId, publicClient);

      expect(weth.decimals).to.equal(18);
      expect(weth.symbol).to.be.undefined;
      expect(weth.name).to.be.undefined;
    });

    it('handles invalid token address gracefully', async function () {
      const invalidAddress = '0x0000000000000000000000000000000000000000';
      const token = await getToken(
        invalidAddress,
        chainId,
        publicClient,
        undefined,
        true,
      );

      expect(token.decimals).to.equal(18);
      expect(token.symbol).to.be.undefined;
      expect(token.name).to.be.undefined;
    });
  });

  describe('bulkGetToken', () => {
    it('Get multiple tokens info in bulk', async function () {
      const tokens = await getBulkTokens(
        [WBTC_ADDRESS, WETH_ADDRESS],
        chainId,
        publicClient,
        undefined,
        true,
      );

      expect(tokens.length).to.equal(2);

      // Check WBTC
      expect(tokens[0].decimals).to.equal(8);
      expect(tokens[0].symbol).to.equal('WBTC');
      expect(tokens[0].name).to.equal('Wrapped BTC');

      // Check WETH
      expect(tokens[1].decimals).to.equal(18);
      expect(tokens[1].symbol).to.equal('WETH');
      expect(tokens[1].name).to.equal('Wrapped Ether');
    });

    it('Get multiple tokens decimals only in bulk', async function () {
      const tokens = await getBulkTokens(
        [WBTC_ADDRESS, WETH_ADDRESS],
        chainId,
        publicClient,
      );

      expect(tokens.length).to.equal(2);

      // Check decimals only
      expect(tokens[0].decimals).to.equal(8);
      expect(tokens[0].symbol).to.be.undefined;
      expect(tokens[0].name).to.be.undefined;

      expect(tokens[1].decimals).to.equal(18);
      expect(tokens[1].symbol).to.be.undefined;
      expect(tokens[1].name).to.be.undefined;
    });

    it('Handles errors gracefully when fetching invalid tokens', async function () {
      const invalidAddress = '0x0000000000000000000000000000000000000000';
      const tokens = await getBulkTokens(
        [invalidAddress, WETH_ADDRESS],
        chainId,
        publicClient,
        undefined,
        true,
      );

      expect(tokens.length).to.equal(2);

      // Invalid token should default to 18 decimals
      expect(tokens[0].decimals).to.equal(18);
      expect(tokens[0].symbol).to.be.undefined;
      expect(tokens[0].name).to.be.undefined;

      // Valid token should work normally
      expect(tokens[1].decimals).to.equal(18);
      expect(tokens[1].symbol).to.equal('WETH');
      expect(tokens[1].name).to.equal('Wrapped Ether');
    });
  });
});
