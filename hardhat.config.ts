import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      chainId: 1,
    },
  },
  paths: {
    tests: './test/hardhat',
  },
};

export default config;
