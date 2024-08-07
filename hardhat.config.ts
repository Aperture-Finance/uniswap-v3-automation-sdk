import '@nomicfoundation/hardhat-viem';
import '@nomiclabs/hardhat-ethers';
import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      chainId: 1,
      loggingEnabled: false,
      accounts: [],
    },
  },
  paths: {
    tests: './test/hardhat',
    artifacts: './test',
  },
  mocha: {
    timeout: 180 * 1e3, // 180 seconds instead of the default 40 seconds because github actions workers may be slow.
  },
};

export default config;
