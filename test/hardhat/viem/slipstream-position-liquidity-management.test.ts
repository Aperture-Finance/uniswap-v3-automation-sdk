import { Position, nearestUsableTick } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import hre, { ethers } from 'hardhat';
import {
  GetContractReturnType,
  PublicClient,
  TestClient,
  WalletClient,
  getContract,
  parseEther,
  walletActions,
} from 'viem';
import { mainnet } from 'viem/chains';

import {
  ApertureSupportedChainId,
  IERC20__factory,
  WETH__factory,
  alignPriceToClosestUsableTickWithTickSpacing,
  getAMMInfo,
  parsePrice,
  priceToClosestTickSafe,
} from '../../../src';
import {
  BasicPositionInfo,
  getAddLiquidityTx,
  getBasicPositionInfo,
  getCollectTx,
  getCollectedFeesFromReceipt,
  getCreatePositionTx,
  getCurrencyAmount,
  getMintedPositionIdFromTxReceipt,
  getNativeCurrency,
  getPool,
  getPositionFromBasicInfo,
  getRemoveLiquidityTx,
  getToken,
  viewCollectableTokenAmounts,
} from '../../../src/viem';
import { expect, resetFork } from '../common';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // token1
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'; // token0

describe('Slipstream Position liquidity management tests', function () {
  const amm = AutomatedMarketMakerEnum.enum.SLIPSTREAM;
  const positionId = 293613n;
  const blockNumber = 17776451n;
  const tickSpacing = 100;
  const eoa = '0xFf09eE65939bF6cfcB1aA44D7Fe0C237CB9ccBAb';

  // const tickSpacing = 200;
  // const blockNumber = 17839113n;
  // const positionId = 13465n;
  // Owner of position id `positionId` as of `blockNumber`.
  // const eoa = '0xeF1Ce5fddd0a1cb903b49608F6e1A37199DCf2a6';

  const WHALE_ADDRESS = '0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A';

  const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;

  let USDC: Token, WETH: Token;
  let testClient: TestClient;
  let publicClient: PublicClient;
  let impersonatedOwnerClient: WalletClient;

  let usdcContract: GetContractReturnType<
      typeof IERC20__factory.abi,
      PublicClient
    >,
    wethContract: GetContractReturnType<
      typeof IERC20__factory.abi,
      PublicClient
    >;

  let usdcBalanceBefore: bigint,
    wethBalanceBefore: bigint,
    nativeEtherBalanceBefore: bigint;
  let position4BasicInfo: BasicPositionInfo;
  let position4ColletableTokenAmounts: {
    token0Amount: CurrencyAmount<Token>;
    token1Amount: CurrencyAmount<Token>;
  };

  beforeEach(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient, blockNumber, process.env.BASE_RPC_URL);
    await testClient.impersonateAccount({
      address: eoa,
    });
    impersonatedOwnerClient = testClient.extend(walletActions);

    // const impersonatedWhaleSigner =
    //   await ethers.getImpersonatedSigner(WHALE_ADDRESS);

    // await impersonatedWhaleSigner.sendTransaction({
    //   to: eoa,
    //   value: parseEther('2'),
    // });

    usdcContract = getContract({
      address: USDC_ADDRESS,
      abi: IERC20__factory.abi,
      client: publicClient,
    });

    wethContract = getContract({
      address: WETH_ADDRESS,
      abi: IERC20__factory.abi,
      client: publicClient,
    });

    nativeEtherBalanceBefore = await publicClient.getBalance({
      address: eoa,
    });

    position4BasicInfo = await getBasicPositionInfo(
      chainId,
      amm,
      positionId,
      publicClient,
    );

    usdcBalanceBefore = await usdcContract.read.balanceOf([eoa]);
    wethBalanceBefore = await wethContract.read.balanceOf([eoa]);

    console.log('before usdc', usdcBalanceBefore);
    console.log('before weth', wethBalanceBefore);

    position4ColletableTokenAmounts = await viewCollectableTokenAmounts(
      chainId,
      amm,
      positionId,
      publicClient,
      position4BasicInfo,
    );

    console.log(
      'position4ColletableTokenAmounts token0Amount',
      position4ColletableTokenAmounts.token0Amount.toFixed(),
    );
    console.log(
      'position4ColletableTokenAmounts token1Amount',
      position4ColletableTokenAmounts.token1Amount.toFixed(),
    );

    USDC = await getToken(USDC_ADDRESS, chainId, publicClient);
    WETH = await getToken(WETH_ADDRESS, chainId, publicClient);

    console.log('publicClient', await publicClient.getChainId());
  });

  it('Slipstream Collect fees', async function () {
    const txRequest = await getCollectTx(
      positionId,
      eoa,
      chainId,
      amm,
      publicClient,
      false,
      position4BasicInfo,
    );

    console.log('txRequest', txRequest);

    // const txReceipt = await publicClient.getTransactionReceipt({
    //   hash: await impersonatedOwnerClient.sendTransaction({
    //     ...txRequest,
    //     account: eoa,
    //     chain: mainnet, // this is weird, but it works
    //   }),
    // });

    const eoaSigner = await ethers.getImpersonatedSigner(eoa);
    const txReceipt = await (await eoaSigner.sendTransaction(txRequest)).wait();

    const collectedFees = getCollectedFeesFromReceipt(
      txReceipt,
      position4BasicInfo.token0,
      position4BasicInfo.token1,
    );

    console.log(
      'collectedFees token0Amount',
      collectedFees.token0Amount.toFixed(),
    );

    console.log(
      'collectedFees token1Amount',
      collectedFees.token1Amount.toFixed(),
    );

    console.log('after usdc', await usdcContract.read.balanceOf([eoa]));
    console.log('after weth', await wethContract.read.balanceOf([eoa]));

    expect(collectedFees).deep.equal(position4ColletableTokenAmounts);

    expect(await usdcContract.read.balanceOf([eoa])).to.equal(
      usdcBalanceBefore +
        BigInt(
          position4ColletableTokenAmounts.token0Amount.quotient.toString(),
        ),
    );
    expect(await wethContract.read.balanceOf([eoa])).to.equal(
      wethBalanceBefore +
        BigInt(
          position4ColletableTokenAmounts.token1Amount.quotient.toString(),
        ),
    );
  });

  it('Decrease liquidity (receive native ether + USDC), increase liquidity, and create position', async function () {
    // ------- Decrease Liquidity -------
    // Decrease liquidity from position.
    const position = await getPositionFromBasicInfo(
      position4BasicInfo,
      chainId,
      amm,
      publicClient,
    );
    const liquidityPercentage = new Percent(1); // 100%
    const removeLiquidityTxRequest = await getRemoveLiquidityTx(
      {
        tokenId: positionId.toString(),
        liquidityPercentage,
        slippageTolerance: new Percent(0),
        deadline: Math.floor(Date.now() / 1000),
      },
      eoa,
      chainId,
      amm,
      publicClient,
      /*receiveNativeEtherIfApplicable=*/ true,
      position,
    );

    console.log('removeLiquidityTxRequest', removeLiquidityTxRequest);

    // const removeLiquidityTxReceipt = await publicClient.getTransactionReceipt({
    //   hash: await impersonatedOwnerClient.sendTransaction({
    //     ...removeLiquidityTxRequest,
    //     account: eoa,
    //     chain: mainnet,
    //   }),
    // });

    // const collectedFees = getCollectedFeesFromReceipt(
    //   removeLiquidityTxReceipt,
    //   position4BasicInfo.token0,
    //   position4BasicInfo.token1,
    // );

    const eoaSigner = await ethers.getImpersonatedSigner(eoa);
    const removeLiquidityTxReceipt = await (
      await eoaSigner.sendTransaction(removeLiquidityTxRequest)
    ).wait();
    const collectedFees = getCollectedFeesFromReceipt(
      removeLiquidityTxReceipt,
      position4BasicInfo.token0,
      position4BasicInfo.token1,
    );

    console.log('usdcContract', await usdcContract.read.balanceOf([eoa]));
    console.log(
      'eth',
      await publicClient.getBalance({
        address: eoa,
      }),
    );

    // expect(collectedFees).deep.equal(position4ColletableTokenAmounts);
    // expect(await usdtContract.read.balanceOf([eoa])).to.equal(
    //   usdcBalanceBefore +
    //     // Add collected USDC fees.
    //     BigInt(
    //       position4ColletableTokenAmounts.token1Amount.quotient.toString(),
    //     ) +
    //     // Add withdrawn USDC liquidity.
    //     BigInt(position.amount1.quotient.toString()),
    // );
    // expect(
    //   await publicClient.getBalance({
    //     address: eoa,
    //   }),
    // ).to.equal(
    //   nativeEtherBalanceBefore +
    //     // Add collected WETH fees.
    //     BigInt(
    //       position4ColletableTokenAmounts.token0Amount.quotient.toString(),
    //     ) +
    //     // Add withdrawn WETH liquidity.
    //     BigInt(position.amount0.quotient.toString()) -
    //     // Subtract gas paid in ETH.
    //     BigInt(
    //       removeLiquidityTxReceipt.gasUsed *
    //         removeLiquidityTxReceipt.effectiveGasPrice,
    //     ),
    // );

    // ------- Add Liquidity -------
    // We now start to add some liquidity to position id 4.
    // This involves three steps:
    // (1) Figure out the amount of liquidity that can be minted with the provided amounts of the two tokens.
    // (2) Approve the two tokens for Uniswap NPM contract to spend, if necessary.
    // (3) Send out the tx that adds liquidity.

    // Here we want to provide 0.01 WETH along with the necessary USDC amount.
    const oneWETH = getCurrencyAmount(WETH, '0.01');
    // We find the necessary amount of USDC to pair with 1 WETH.
    // Since WETH is token1 in the pool, we use `Position.fromAmount1()`.
    const usdcRawAmount = Position.fromAmount0({
      pool: position.pool,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      amount0: oneWETH.quotient,
      useFullPrecision: false,
    }).mintAmounts.amount0;

    console.log('usdcRawAmount', usdcRawAmount.toString());

    // Now we find the liquidity amount that can be added by providing 1 WETH and `usdcRawAmount` of USDC.
    const liquidityToAdd = Position.fromAmounts({
      pool: position.pool,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      amount0: oneWETH.quotient,
      amount1: usdcRawAmount,
      useFullPrecision: false,
    }).liquidity;

    // Approve Uniswap NPM to spend USDC. Since we are providing native ether in this example, we don't need to approve WETH.
    // const { request } = await publicClient.simulateContract({
    //   abi: IERC20__factory.abi,
    //   address: USDC_ADDRESS,
    //   functionName: 'approve',
    //   args: [
    //     getAMMInfo(chainId, amm)!.nonfungiblePositionManager as Address,
    //     BigInt(usdcRawAmount.toString()),
    //   ] as const,
    //   account: eoa,
    // });
    // await impersonatedOwnerClient.writeContract(request);

    // Approve Uniswap NPM to spend USDC. Since we are providing native ether in this example, we don't need to approve WETH.
    await IERC20__factory.connect(USDC_ADDRESS, eoaSigner).approve(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      usdcRawAmount.toString(),
    );

    // We are now ready to generate and send out the add-liquidity tx.
    const addLiquidityTxRequest = await getAddLiquidityTx(
      {
        slippageTolerance: new Percent(0),
        deadline: Math.floor(Date.now() / 1000),
        tokenId: positionId.toString(),
        // Note that `useNative` can be set to true when WETH is one of the two tokens, and the user chooses to provide native ether. Otherwise, this field can be undefined.
        useNative: getNativeCurrency(chainId),
      },
      chainId,
      amm,
      eoa,
      publicClient,
      liquidityToAdd.toString(),
      position,
    );

    await (await eoaSigner.sendTransaction(addLiquidityTxRequest)).wait();
    // await impersonatedOwnerClient.sendTransaction({
    //   ...addLiquidityTxRequest,
    //   account: eoa,
    //   chain: base,
    // });
    expect(
      (await getBasicPositionInfo(chainId, amm, positionId, publicClient))
        .liquidity!,
    ).to.equal(liquidityToAdd.toString());

    console.log('liquidityToAdd', liquidityToAdd.toString());

    // ------- Create Position -------
    // Now we create a new USDC-WETH position.
    // We wish to provide liquidity to the 2500 ~ 4000 USDC per WETH price range, to the tickspacing 100 pool.
    // And we want to provide 0.001 WETH paired with the necessary amount of USDC.

    // First, we align the price range's endpoints.
    const alignedPriceLower = alignPriceToClosestUsableTickWithTickSpacing(
      parsePrice(WETH, USDC, '2500'),
      tickSpacing,
    );
    const alignedPriceUpper = alignPriceToClosestUsableTickWithTickSpacing(
      parsePrice(WETH, USDC, '4000'),
      tickSpacing,
    );

    console.log('alignedPriceLower', alignedPriceLower.toFixed(6));
    console.log('alignedPriceUpper', alignedPriceUpper.toFixed(6));
    // expect(alignedPriceLower.toFixed(6)).to.equal('12.589601');
    // expect(alignedPriceUpper.toFixed(6)).to.equal('27.462794');

    // Second, we construct the `Position` object for the position we want to create.
    // We want to provide 0.001 WETH and the necessary amount of USDC.
    const wethAmount = getCurrencyAmount(WETH, '0.001');
    const tickLower = nearestUsableTick(
      priceToClosestTickSafe(alignedPriceLower),
      tickSpacing,
    );
    const tickUpper = nearestUsableTick(
      priceToClosestTickSafe(alignedPriceUpper),
      tickSpacing,
    );
    // const tickLower = priceToClosestUsableTick(alignedPriceLower, poolFee);
    // const tickUpper = priceToClosestUsableTick(alignedPriceUpper, poolFee);
    const pool = await getPool(
      WETH,
      USDC,
      tickSpacing,
      chainId,
      amm,
      publicClient,
    );

    console.log('pool', pool.token0.decimals);
    console.log('pool', pool.token1.decimals);

    // Since WETH is token0, we use `Position.fromAmount0()`.
    const positionToCreate = Position.fromAmount0({
      pool,
      tickLower,
      tickUpper,
      amount0: wethAmount.quotient,
      useFullPrecision: false,
    });

    console.log(
      'positionToCreate.mintAmounts.amount0',
      positionToCreate.mintAmounts.amount0.toString(),
    );
    console.log(
      'positionToCreate.mintAmounts.amount1',
      positionToCreate.mintAmounts.amount1.toString(),
    );

    // Now we know that we need to provide 10 USDC and x WETH.
    expect(
      CurrencyAmount.fromRawAmount(
        USDC,
        positionToCreate.mintAmounts.amount1,
      ).toExact(),
    ).to.equal('5.264917');

    expect(
      CurrencyAmount.fromRawAmount(
        WETH,
        positionToCreate.mintAmounts.amount0,
      ).toExact(),
    ).to.equal('0.000999999999999357');

    // Approve Uniswap NPM to spend USDC.
    await IERC20__factory.connect(USDC_ADDRESS, eoaSigner).approve(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      positionToCreate.mintAmounts.amount0.toString(),
    );

    // Approve Uniswap NPM to spend WETH.
    await WETH__factory.connect(WETH_ADDRESS, eoaSigner).deposit({
      value: positionToCreate.mintAmounts.amount1.toString(),
    });
    await WETH__factory.connect(WETH_ADDRESS, eoaSigner).approve(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      positionToCreate.mintAmounts.amount1.toString(),
    );

    // Approve Uniswap NPM to spend USDC.
    // const { request: approveUsdc } = await publicClient.simulateContract({
    //   abi: IERC20__factory.abi,
    //   address: USDC_ADDRESS,
    //   functionName: 'approve',
    //   args: [
    //     getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
    //     BigInt(positionToCreate.mintAmounts.amount0.toString()),
    //   ] as const,
    //   account: eoa,
    // });
    // await impersonatedOwnerClient.writeContract(approveUsdc);

    // // Approve Uniswap NPM to spend WETH.
    // const { request: depositWETH } = await publicClient.simulateContract({
    //   abi: WETH__factory.abi,
    //   address: WETH_ADDRESS,
    //   functionName: 'deposit',
    //   value: BigInt(positionToCreate.mintAmounts.amount1.toString()),
    //   account: eoa,
    // });
    // await impersonatedOwnerClient.writeContract(depositWETH);

    // const { request: approveWETH } = await publicClient.simulateContract({
    //   abi: WETH__factory.abi,
    //   address: WETH_ADDRESS,
    //   functionName: 'approve',
    //   args: [
    //     getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
    //     BigInt(positionToCreate.mintAmounts.amount1.toString()),
    //   ],
    //   account: eoa,
    // });
    // await impersonatedOwnerClient.writeContract(approveWETH);

    // We are now ready to generate and send out the create-position tx.
    const createPositionTxRequest = await getCreatePositionTx(
      positionToCreate,
      {
        slippageTolerance: new Percent(5, 100),
        deadline: Math.floor(Date.now() / 1000),
        recipient: eoa,
      },
      chainId,
      amm,
      publicClient,
    );

    // const createPositionTxReceipt = await publicClient.getTransactionReceipt({
    //   hash: await impersonatedOwnerClient.sendTransaction({
    //     ...createPositionTxRequest,
    //     account: eoa,
    //     chain: base,
    //   }),
    // });

    const createPositionTxReceipt = await (
      await eoaSigner.sendTransaction(createPositionTxRequest)
    ).wait();

    const createdPositionId = getMintedPositionIdFromTxReceipt(
      chainId,
      amm,
      createPositionTxReceipt,
      eoa,
    )!;
    expect(
      await getBasicPositionInfo(chainId, amm, createdPositionId, publicClient),
    ).to.deep.equal({
      fee: positionToCreate.pool.fee,
      liquidity: positionToCreate.liquidity.toString(),
      tickLower: positionToCreate.tickLower,
      tickUpper: positionToCreate.tickUpper,
      token0: USDC,
      token1: WETH,
      tickSpacing: positionToCreate.pool.tickSpacing,
    });
  });
});
