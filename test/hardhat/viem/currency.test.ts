import hre from 'hardhat';
import { PublicClient, TestClient } from 'viem';

import { ApertureSupportedChainId } from '../../../src';
import { bulkGetToken } from '../../../src/viem';
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

  it('Get multiple tokens info in bulk', async function () {
    const tokens = await bulkGetToken(
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
    const tokens = await bulkGetToken(
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
    const tokens = await bulkGetToken(
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
