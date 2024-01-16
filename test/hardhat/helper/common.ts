import { reset as hardhatReset } from '@nomicfoundation/hardhat-network-helpers';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { config as dotenvConfig } from 'dotenv';
import { ethers } from 'hardhat';

import { ApertureSupportedChainId } from '../../../src';

dotenvConfig();

chai.use(chaiAsPromised);
export const hardhatForkProvider = ethers.provider;

export const expect = chai.expect;
export const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;
// A whale address (Avax bridge) on Ethereum mainnet with a lot of ethers and token balances.
export const WHALE_ADDRESS = '0x8EB8a3b98659Cce290402893d0123abb75E3ab28';
export const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
// Owner of position id 4 on Ethereum mainnet.
export const eoa = '0x4bD047CA72fa05F0B89ad08FE5Ba5ccdC07DFFBF';
// A fixed epoch second value representing a moment in the year 2099.
export const deadline = '4093484400';

// Test wallet so we can test signing permit messages.
// Public key: 0x035dcbb4b39244cef94d3263074f358a1d789e6b99f278d5911f9694da54312636
// Address: 0x1ccaCD01fD2d973e134EC6d4F916b90A45634eCe
export const TEST_WALLET_PRIVATE_KEY =
  '0x077646fb889571f9ce30e420c155812277271d4d914c799eef764f5709cafd5b';

export async function resetHardhatNetwork() {
  await hardhatReset(
    `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    /*blockNumber=*/ 17188000,
  );
}
