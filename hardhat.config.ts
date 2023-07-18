import { config as dotenvConfig } from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';

dotenvConfig();

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      chainId: 1,
      forking: {
        blockNumber: 17188000,
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      },
    },
  },
  paths: {
    tests: './test/hardhat',
  },
};

export default config;
