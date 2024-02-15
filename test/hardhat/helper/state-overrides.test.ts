import '@nomiclabs/hardhat-ethers';
import { FeeAmount, nearestUsableTick } from '@uniswap/v3-sdk';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { zeroAddress } from 'viem';

import {
  IERC20__factory,
  UniV3Automan__factory,
  getChainInfo,
} from '../../../src';
import {
  computeOperatorApprovalSlot,
  generateAccessList,
  getERC20Overrides,
  getNPM,
  getPool,
  simulateMintOptimal,
} from '../../../src/helper';
import {
  WBTC_ADDRESS,
  WETH_ADDRESS,
  WHALE_ADDRESS,
  chainId,
  eoa,
  expect,
  hardhatForkProvider,
  resetHardhatNetwork,
} from './common';

describe('Helper - State overrides tests', function () {
  it('Test computeOperatorApprovalSlot', async function () {
    await resetHardhatNetwork();
    const impersonatedOwnerSigner = await ethers.getImpersonatedSigner(eoa);
    // Deploy Automan.
    const automanContract = await new UniV3Automan__factory(
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(
      getChainInfo(chainId).uniswap_v3_nonfungible_position_manager,
      /*owner=*/ WHALE_ADDRESS,
    );
    await automanContract.deployed();
    const npm = getChainInfo(chainId).uniswap_v3_nonfungible_position_manager;
    const slot = computeOperatorApprovalSlot(eoa, automanContract.address);
    expect(slot).to.equal(
      '0x0e19f2cddd2e7388039c7ef081490ef6bd2600540ca6caf0f478dc7dfebe509b',
    );
    expect(await hardhatForkProvider.getStorageAt(npm, slot)).to.equal(
      defaultAbiCoder.encode(['bool'], [false]),
    );
    await getNPM(chainId, impersonatedOwnerSigner).setApprovalForAll(
      automanContract.address,
      true,
    );
    expect(await hardhatForkProvider.getStorageAt(npm, slot)).to.equal(
      defaultAbiCoder.encode(['bool'], [true]),
    );
  });

  it('Test generateAccessList', async function () {
    const provider = new ethers.providers.InfuraProvider(chainId);
    const balanceOfData = IERC20__factory.createInterface().encodeFunctionData(
      'balanceOf',
      [eoa],
    );
    const { accessList } = await generateAccessList(
      {
        from: zeroAddress,
        to: WETH_ADDRESS,
        data: balanceOfData,
      },
      provider,
    );
    expect(accessList[0].storageKeys[0]).to.equal(
      '0x5408245386fab212e3c3357882670a5f5af556f7edf543831e2995afd71f4348',
    );
  });

  it('Test getTokensOverrides', async function () {
    const provider = new ethers.providers.InfuraProvider(chainId);
    const amount0Desired = '1000000000000000000';
    const amount1Desired = '100000000';
    const { aperture_uniswap_v3_automan } = getChainInfo(chainId);
    const stateOverrides = {
      ...(await getERC20Overrides(
        WETH_ADDRESS,
        eoa,
        aperture_uniswap_v3_automan,
        amount0Desired,
        provider,
      )),
      ...(await getERC20Overrides(
        WBTC_ADDRESS,
        eoa,
        aperture_uniswap_v3_automan,
        amount1Desired,
        provider,
      )),
    };
    expect(stateOverrides).to.deep.equal({
      [WETH_ADDRESS]: {
        stateDiff: {
          '0x5408245386fab212e3c3357882670a5f5af556f7edf543831e2995afd71f4348':
            '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
          '0x746950bb1accd12acebc948663f14ea555a83343e6f94af3b6143301c7cadd30':
            '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
        },
      },
      [WBTC_ADDRESS]: {
        stateDiff: {
          '0x45746063dcd859f1d120c6388dbc814c95df435a74a62b64d984ad16fe434fff':
            '0x0000000000000000000000000000000000000000000000000000000005f5e100',
          '0x71f8d5def281e31983e4625bff84022ae0c3d962552b2a6a1798de60e3860703':
            '0x0000000000000000000000000000000000000000000000000000000005f5e100',
        },
      },
    });
  });

  it('Test simulateMintOptimal', async function () {
    const blockNumber = 17975698;
    const provider = new ethers.providers.InfuraProvider(chainId);
    const token0 = WBTC_ADDRESS;
    const token1 = WETH_ADDRESS;
    const fee = FeeAmount.MEDIUM;
    const amount0Desired = '100000000';
    const amount1Desired = '1000000000000000000';
    const pool = await getPool(
      token0,
      token1,
      fee,
      chainId,
      undefined,
      blockNumber,
    );
    const mintParams = {
      token0,
      token1,
      fee,
      tickLower: nearestUsableTick(
        pool.tickCurrent - 10 * pool.tickSpacing,
        pool.tickSpacing,
      ),
      tickUpper: nearestUsableTick(
        pool.tickCurrent + 10 * pool.tickSpacing,
        pool.tickSpacing,
      ),
      amount0Desired,
      amount1Desired,
      amount0Min: 0,
      amount1Min: 0,
      recipient: eoa,
      deadline: Math.floor(Date.now() / 1000 + 60 * 30),
    };
    const { liquidity, amount0, amount1 } = await simulateMintOptimal(
      chainId,
      provider,
      eoa,
      mintParams,
      undefined,
      blockNumber,
    );
    expect(liquidity.toString()).to.equal('716894157038546');
    expect(amount0.toString()).to.equal('51320357');
    expect(amount1.toString()).to.equal('8736560293857784398');
  });
});
