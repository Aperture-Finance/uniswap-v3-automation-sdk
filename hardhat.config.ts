import '@nomicfoundation/hardhat-viem';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-tracer';
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
};

export default config;
