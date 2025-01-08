import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import hre from 'hardhat';
import { PublicClient, TestClient } from 'viem';

import { ApertureSupportedChainId } from '../../../src';
import { getBulkPools, getPool } from '../../../src/viem';
import {
  DAI_ADDRESS,
  USDC_ADDRESS,
  WETH_ADDRESS,
  expect,
  resetFork,
} from '../common';

describe('Viem - Pool tests', function () {
  let publicClient: PublicClient;
  let testClient: TestClient;
  const chainId = ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID;

  before(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient, 17188000n);
  });

  describe('getPool', () => {
    it('fetches UniswapV3 pool info correctly', async function () {
      // USDC/WETH 0.05% pool
      const pool = await getPool(
        USDC_ADDRESS,
        WETH_ADDRESS,
        500, // 0.05% fee tier
        chainId,
        AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
        publicClient,
      );

      expect(pool.token0.address.toLowerCase()).to.equal(
        USDC_ADDRESS.toLowerCase(),
      );
      expect(pool.token1.address.toLowerCase()).to.equal(
        WETH_ADDRESS.toLowerCase(),
      );
      expect(pool.fee).to.equal(500);
      expect(pool.liquidity.toString()).to.not.equal('0');
      expect(pool.tickSpacing).to.equal(10);
    });

    it('fetches pool info with different fee tiers', async function () {
      // DAI/USDC 0.01% pool
      const pool = await getPool(
        DAI_ADDRESS,
        USDC_ADDRESS,
        100, // 0.01% fee tier
        chainId,
        AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
        publicClient,
      );

      expect(pool.token0.address.toLowerCase()).to.equal(
        DAI_ADDRESS.toLowerCase(),
      );
      expect(pool.token1.address.toLowerCase()).to.equal(
        USDC_ADDRESS.toLowerCase(),
      );
      expect(pool.fee).to.equal(100);
      expect(pool.liquidity.toString()).to.not.equal('0');
    });

    it('handles token order correctly regardless of input order', async function () {
      // Get pool with tokens in one order
      const pool1 = await getPool(
        WETH_ADDRESS,
        USDC_ADDRESS,
        500,
        chainId,
        AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
        publicClient,
      );

      // Get pool with tokens in reverse order
      const pool2 = await getPool(
        USDC_ADDRESS,
        WETH_ADDRESS,
        500,
        chainId,
        AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
        publicClient,
      );

      // Verify both pools have the same token order (should be sorted)
      expect(pool1.token0.address).to.equal(pool2.token0.address);
      expect(pool1.token1.address).to.equal(pool2.token1.address);
      expect(pool1.fee).to.equal(pool2.fee);
    });

    it('throws error for non-existent pool', async function () {
      // Try to fetch a pool with an invalid fee tier
      await expect(
        getPool(
          WETH_ADDRESS,
          USDC_ADDRESS,
          50, // Invalid fee tier
          chainId,
          AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
          publicClient,
        ),
      ).to.be.rejected;
    });

    it.skip('throws error for uninitialized pool', async function () {
      // This test might need to be adjusted based on how to find an uninitialized pool
      // One way is to deploy a new pool or find a known uninitialized pool
      await expect(
        getPool(
          WETH_ADDRESS,
          USDC_ADDRESS,
          3000, // Use a fee tier where pool exists but might be uninitialized
          chainId,
          AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
          publicClient,
        ),
      ).to.be.rejectedWith('Pool has been created but not yet initialized');
    });
  });

  describe('bulkGetPool', () => {
    it('fetches multiple UniswapV3 pools correctly', async function () {
      const poolParams = [
        {
          tokenA: USDC_ADDRESS,
          tokenB: WETH_ADDRESS,
          feeOrTickSpacing: 500, // 0.05% fee tier
        },
        {
          tokenA: DAI_ADDRESS,
          tokenB: USDC_ADDRESS,
          feeOrTickSpacing: 100, // 0.01% fee tier
        },
      ];

      const pools = await getBulkPools(
        poolParams,
        chainId,
        AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
        publicClient,
      );

      expect(pools.length).to.equal(2);

      // Check USDC/WETH pool
      expect(pools[0].token0.address.toLowerCase()).to.equal(
        USDC_ADDRESS.toLowerCase(),
      );
      expect(pools[0].token1.address.toLowerCase()).to.equal(
        WETH_ADDRESS.toLowerCase(),
      );
      expect(pools[0].fee).to.equal(500);
      expect(pools[0].liquidity.toString()).to.not.equal('0');

      // Check DAI/USDC pool
      expect(pools[1].token0.address.toLowerCase()).to.equal(
        DAI_ADDRESS.toLowerCase(),
      );
      expect(pools[1].token1.address.toLowerCase()).to.equal(
        USDC_ADDRESS.toLowerCase(),
      );
      expect(pools[1].fee).to.equal(100);
      expect(pools[1].liquidity.toString()).to.not.equal('0');
    });

    it('handles token order correctly in bulk fetching', async function () {
      const poolParams1 = [
        {
          tokenA: WETH_ADDRESS,
          tokenB: USDC_ADDRESS,
          feeOrTickSpacing: 500,
        },
      ];

      const poolParams2 = [
        {
          tokenA: USDC_ADDRESS,
          tokenB: WETH_ADDRESS,
          feeOrTickSpacing: 500,
        },
      ];

      const [pools1, pools2] = await Promise.all([
        getBulkPools(
          poolParams1,
          chainId,
          AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
          publicClient,
        ),
        getBulkPools(
          poolParams2,
          chainId,
          AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
          publicClient,
        ),
      ]);

      // Verify both pools have the same token order
      expect(pools1[0].token0.address).to.equal(pools2[0].token0.address);
      expect(pools1[0].token1.address).to.equal(pools2[0].token1.address);
      expect(pools1[0].fee).to.equal(pools2[0].fee);
    });

    it('throws error for non-existent pools in bulk', async function () {
      const poolParams = [
        {
          tokenA: WETH_ADDRESS,
          tokenB: USDC_ADDRESS,
          feeOrTickSpacing: 50, // Invalid fee tier
        },
      ];

      expect(
        await getBulkPools(
          poolParams,
          chainId,
          AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
          publicClient,
        ),
      ).to.deep.equal([null]);
    });

    it('handles mixed valid and invalid pools appropriately', async function () {
      const poolParams = [
        {
          tokenA: USDC_ADDRESS,
          tokenB: WETH_ADDRESS,
          feeOrTickSpacing: 500, // Valid fee tier
        },
        {
          tokenA: WETH_ADDRESS,
          tokenB: USDC_ADDRESS,
          feeOrTickSpacing: 50, // Invalid fee tier
        },
      ];

      const [pool1, pool2] = await getBulkPools(
        poolParams,
        chainId,
        AutomatedMarketMakerEnum.Enum.UNISWAP_V3,
        publicClient,
      );

      expect(pool1?.token0.address.toLowerCase()).to.equal(
        USDC_ADDRESS.toLowerCase(),
      );
      expect(pool1?.token1.address.toLowerCase()).to.equal(
        WETH_ADDRESS.toLowerCase(),
      );
      expect(pool1?.fee).to.equal(500);

      expect(pool2).to.be.null;
    });
  });
});
