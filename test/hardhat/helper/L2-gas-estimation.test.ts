import { ApertureSupportedChainId } from '../../../src';
import {
  estimateTotalGasCostForOptimismLikeL2Tx,
  getPublicProvider,
} from '../../../src/helper';
import { expect } from './common';

describe('Helper - Optimism-like L2 total gas cost estimation tests', function () {
  it('Scroll mainnet', async function () {
    const scrollProvider = getPublicProvider(
      ApertureSupportedChainId.SCROLL_MAINNET_CHAIN_ID,
    );
    const totalGasCost = await estimateTotalGasCostForOptimismLikeL2Tx(
      {
        from: '0x01aB1be3518F490c9F0b97447FBb1c335EFbE600',
        to: '0x01aB1be3518F490c9F0b97447FBb1c335EFbE600',
        value: 1,
      },
      ApertureSupportedChainId.SCROLL_MAINNET_CHAIN_ID,
      scrollProvider,
    );
    expect(totalGasCost.gt('0')).to.equal(true);
  });

  it('Optimism mainnet', async function () {
    const scrollProvider = getPublicProvider(
      ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID,
    );
    const totalGasCost = await estimateTotalGasCostForOptimismLikeL2Tx(
      {
        from: '0x01aB1be3518F490c9F0b97447FBb1c335EFbE600',
        to: '0x01aB1be3518F490c9F0b97447FBb1c335EFbE600',
        value: 1,
      },
      ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID,
      scrollProvider,
    );
    expect(totalGasCost.gt('0')).to.equal(true);
  });
});
