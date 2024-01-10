import { ethers } from 'hardhat';

import { WETH__factory } from '../../../src';
import {
  getCurrencyAmount,
  getToken,
  getUnwrapETHTx,
  getWrapETHTx,
} from '../../../src/helper';
import {
  WETH_ADDRESS,
  WHALE_ADDRESS,
  chainId,
  expect,
  hardhatForkProvider,
  resetHardhatNetwork,
} from './common';

describe('Helper - WETH transaction tests', function () {
  beforeEach(async function () {
    await resetHardhatNetwork();
  });
  it('Deposit and withdraw WETH', async function () {
    const wethContract = WETH__factory.connect(
      WETH_ADDRESS,
      hardhatForkProvider,
    );
    const wethBalanceBefore = await wethContract.balanceOf(WHALE_ADDRESS);
    const WETH = await getToken(WETH_ADDRESS, chainId, hardhatForkProvider);
    const wrapAmount = getCurrencyAmount(WETH, '10').quotient.toString();
    const whaleSigner = await ethers.getImpersonatedSigner(WHALE_ADDRESS);
    await (
      await whaleSigner.sendTransaction(getWrapETHTx(chainId, wrapAmount))
    ).wait();
    expect(
      (await wethContract.balanceOf(WHALE_ADDRESS)).eq(
        wethBalanceBefore.add(wrapAmount),
      ),
    ).to.equal(true);
    await (
      await whaleSigner.sendTransaction(getUnwrapETHTx(chainId, wrapAmount))
    ).wait();
    expect(
      (await wethContract.balanceOf(WHALE_ADDRESS)).eq(
        wethBalanceBefore.toString(),
      ),
    ).to.equal(true);
  });
});
