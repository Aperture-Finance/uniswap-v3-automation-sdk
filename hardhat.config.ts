import '@nomicfoundation/hardhat-viem';
import '@nomiclabs/hardhat-ethers';
import { HardhatUserConfig } from 'hardhat/config';
import 'tsconfig-paths/register';

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
