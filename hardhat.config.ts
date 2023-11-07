import '@nomicfoundation/hardhat-viem';
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
  },
};

export default config;
