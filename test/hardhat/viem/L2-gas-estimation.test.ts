import { ApertureSupportedChainId } from '../../../src';
import {
  estimateTotalGasCostForOptimismLikeL2Tx,
  getPublicClient,
} from '../../../src/viem';
import { expect } from '../common';

describe('Viem - Optimism-like L2 total gas cost estimation tests', function () {
  it('Scroll mainnet', async function () {
    const scrollClient = getPublicClient(
      ApertureSupportedChainId.SCROLL_MAINNET_CHAIN_ID,
    );
    const { totalGasCost } = await estimateTotalGasCostForOptimismLikeL2Tx(
      {
        from: '0x01aB1be3518F490c9F0b97447FBb1c335EFbE600',
        to: '0x01aB1be3518F490c9F0b97447FBb1c335EFbE600',
        value: 1n,
      },
      ApertureSupportedChainId.SCROLL_MAINNET_CHAIN_ID,
      scrollClient,
    );
    expect(totalGasCost > 0n).to.equal(true);
  });

  it('Optimism mainnet', async function () {
    const opClient = getPublicClient(
      ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID,
    );
    const { totalGasCost } = await estimateTotalGasCostForOptimismLikeL2Tx(
      {
        from: '0x01aB1be3518F490c9F0b97447FBb1c335EFbE600',
        to: '0x01aB1be3518F490c9F0b97447FBb1c335EFbE600',
        value: 1n,
      },
      ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID,
      opClient,
    );
    expect(totalGasCost > 0n).to.equal(true);
  });
});
