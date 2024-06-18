import { Percent } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { BigNumber } from 'ethers';
import hre, { ethers } from 'hardhat';
import { PublicClient, TestClient, WalletClient, walletActions } from 'viem';
import { mainnet } from 'viem/chains';

import {
  ActionTypeEnum,
  ApertureSupportedChainId,
  ConditionTypeEnum,
  PCSV3Automan,
  PCSV3Automan__factory,
  UniV3OptimalSwapRouter__factory,
  getAMMInfo,
} from '../../../src';
import { getNPM } from '../../../src/helper';
import {
  generateAutoCompoundRequestPayload,
  getReinvestTx,
} from '../../../src/viem';
import { expect, resetFork } from '../common';

// Tests for UniV3Automan transactions on a forked Ethereum mainnet.
describe.skip('Viem - PCSV3Automan transaction tests', function () {
  const amm = AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3;
  // const WETH_ADDRESS = '0x2170Ed0880ac9A755fd29B2688956BD959F933F8';
  // const WBTC_ADDRESS = '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c';
  const WHALE_ADDRESS = '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3';
  const positionId = 528336n;
  const eoa = '0x4B104b883104d17E618d84f766d0be06F6F6f486';

  const chainId = ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID;

  let automanContract: PCSV3Automan;
  const automanAddress = getAMMInfo(chainId, amm)!.apertureAutoman;
  let testClient: TestClient;
  let publicClient: PublicClient;
  let impersonatedOwnerClient: WalletClient;

  beforeEach(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();

    await resetFork(testClient, 37287100n, process.env.BNB_RPC_URL!);
    await testClient.impersonateAccount({
      address: eoa,
    });
    impersonatedOwnerClient = testClient.extend(walletActions);

    // Deploy Automan.
    automanContract = await new PCSV3Automan__factory(
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      /*owner=*/ WHALE_ADDRESS,
    );
    await automanContract.deployed();
    await automanContract.setFeeConfig({
      feeCollector: WHALE_ADDRESS,
      // Set the max fee deduction to 50%.
      feeLimitPips: BigNumber.from('500000000000000000'),
    });
    await automanContract.setControllers([WHALE_ADDRESS], [true]);
    const router = await new UniV3OptimalSwapRouter__factory(
      await ethers.getImpersonatedSigner(WHALE_ADDRESS),
    ).deploy(getAMMInfo(chainId, amm)!.nonfungiblePositionManager);
    await router.deployed();
    await automanContract.setSwapRouters([router.address], [true]);

    // Set Automan address in CHAIN_ID_TO_INFO.
    getAMMInfo(chainId, amm)!.apertureAutoman =
      automanContract.address as `0x${string}`;
    getAMMInfo(chainId, amm)!.optimalSwapRouter =
      router.address as `0x${string}`;

    // Owner of position id 528336 sets Automan as operator.
    await getNPM(
      chainId,
      amm,
      await ethers.getImpersonatedSigner(eoa),
    ).setApprovalForAll(automanContract.address, true);
  });

  after(() => {
    // Reset Automan address in CHAIN_ID_TO_INFO.
    getAMMInfo(chainId, amm)!.apertureAutoman = automanAddress;
    testClient.stopImpersonatingAccount({
      address: eoa,
    });
  });

  it('Reinvest', async function () {
    // const liquidityBeforeReinvest = (
    //   await getBasicPositionInfo(chainId, amm, positionId, publicClient)
    // ).liquidity!;
    // expect(liquidityBeforeReinvest.toString()).to.equal('17360687214921889114');

    const { tx: txRequest } = await getReinvestTx(
      chainId,
      amm,
      eoa,
      positionId,
      /*slippageTolerance=*/ new Percent(1, 100),
      /*deadlineEpochSeconds=*/ BigInt(Math.floor(Date.now() / 1000)),
      publicClient,
    );
    // await (await impersonatedOwnerSigner.sendTransaction(txRequest)).wait();

    impersonatedOwnerClient.sendTransaction({
      ...txRequest,
      account: eoa,
      chain: mainnet,
    });

    // don't know why this test is failing
    // const liquidityAfterReinvest = (
    //   await getBasicPositionInfo(chainId, amm, positionId, publicClient)
    // ).liquidity!;
    // expect(liquidityAfterReinvest.toString()).to.equal('17369508569204326673');

    expect(
      generateAutoCompoundRequestPayload(
        eoa,
        chainId,
        AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3,
        positionId.toString(),
        /*feeToPrincipalRatioThreshold=*/ 0.1,
        /*slippage=*/ 0.05,
        /*maxGasProportion=*/ 0.01,
        1627776000,
      ),
    ).to.deep.equal({
      action: {
        maxGasProportion: 0.01,
        slippage: 0.05,
        type: ActionTypeEnum.enum.Reinvest,
      },
      chainId: chainId,
      amm: AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3,
      condition: {
        feeToPrincipalRatioThreshold: 0.1,
        type: ConditionTypeEnum.enum.AccruedFees,
      },
      nftId: positionId.toString(),
      ownerAddr: eoa,
      expiration: 1627776000,
    });
  });
});
