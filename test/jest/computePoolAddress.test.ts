import { FeeAmount } from '@aperture_finance/uniswap-v3-sdk';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';

import { ApertureSupportedChainId, computePoolAddress } from '../../src';

describe('Compute pool address test', () => {
  it('Should compute Uniswap V3 pool address', async () => {
    expect(
      computePoolAddress(
        ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
        AutomatedMarketMakerEnum.enum.UNISWAP_V3,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
        FeeAmount.MEDIUM,
      ),
    ).toBe('0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35');
    expect(
      computePoolAddress(
        ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID,
        AutomatedMarketMakerEnum.enum.UNISWAP_V3,
        '0x55d398326f99059fF775485246999027B3197955', // USDT
        '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
        FeeAmount.LOWEST,
      ),
    ).toBe('0x47a90A2d92A8367A91EfA1906bFc8c1E05bf10c4');
  });

  it('Should compute PancakeSwap V3 pool address', async () => {
    expect(
      computePoolAddress(
        ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
        AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        '0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6', // STG
        FeeAmount.PCS_V3_MEDIUM,
      ),
    ).toBe('0x7524Fe020EDcD072EE98126b49Fa65Eb85F8C44C');
    expect(
      computePoolAddress(
        ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID,
        AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3,
        '0x55d398326f99059fF775485246999027B3197955', // USDT
        '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
        FeeAmount.LOWEST,
      ),
    ).toBe('0x172fcD41E0913e95784454622d1c3724f546f849');
  });

  it('Should compute SlipStream pool address', async () => {
    expect(
      computePoolAddress(
        ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID,
        AutomatedMarketMakerEnum.enum.SLIPSTREAM,
        '0x4200000000000000000000000000000000000006', // WETH
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
        /*fee=*/ undefined,
        /*tickSpacing=*/ 100,
      ),
    ).toBe('0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59');
    expect(
      computePoolAddress(
        ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID,
        AutomatedMarketMakerEnum.enum.SLIPSTREAM,
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
        '0x4200000000000000000000000000000000000006', // WETH
        /*fee=*/ undefined,
        /*tickSpacing=*/ 100,
      ),
    ).toBe('0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59');
  });
});
