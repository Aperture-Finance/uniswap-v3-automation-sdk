import hre from 'hardhat';
import { PublicClient, TestClient, getContract, walletActions } from 'viem';
import { mainnet } from 'viem/chains';

import { IERC20__factory } from '../../../src';
import {
  getCurrencyAmount,
  getToken,
  getUnwrapETHTx,
  getWrapETHTx,
} from '../../../src/viem';
import {
  WETH_ADDRESS,
  WHALE_ADDRESS,
  chainId,
  expect,
  resetFork,
} from '../common';

describe('Viem - WETH transaction tests', function () {
  let testClient: TestClient;
  let publicClient: PublicClient;
  beforeEach(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient, 17188000n);
  });
  it('Deposit and withdraw WETH', async function () {
    const wethContract = getContract({
      address: WETH_ADDRESS,
      abi: IERC20__factory.abi,
      client: publicClient,
    });

    const wethBalanceBefore = await wethContract.read.balanceOf([
      WHALE_ADDRESS,
    ]);
    const WETH = await getToken(WETH_ADDRESS, chainId, publicClient);
    const wrapAmount = BigInt(
      getCurrencyAmount(WETH, '10').quotient.toString(),
    );

    testClient.impersonateAccount({
      address: WHALE_ADDRESS,
    });
    const whaleClient = testClient.extend(walletActions);

    await whaleClient.sendTransaction({
      ...getWrapETHTx(chainId, wrapAmount),
      account: WHALE_ADDRESS,
      chain: mainnet,
    });

    expect(await wethContract.read.balanceOf([WHALE_ADDRESS])).to.equal(
      wethBalanceBefore + wrapAmount,
    );
    await whaleClient.sendTransaction({
      ...getUnwrapETHTx(chainId, wrapAmount),
      account: WHALE_ADDRESS,
      chain: mainnet,
    });
    expect(await wethContract.read.balanceOf([WHALE_ADDRESS])).to.equal(
      wethBalanceBefore,
    );
  });
});
