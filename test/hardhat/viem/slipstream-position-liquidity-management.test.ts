import { Position, priceToClosestTick } from '@aperture_finance/uniswap-v3-sdk';
import { CurrencyAmount, Percent, Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import hre, { ethers } from 'hardhat';
import {
  GetContractReturnType,
  PublicClient,
  TestClient,
  getContract,
  parseEther,
} from 'viem';

import {
  ApertureSupportedChainId,
  IERC20__factory,
  WETH__factory,
  alignPriceToClosestUsableTickWithTickSpacing,
  getAMMInfo,
  parsePrice,
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

describe('SlipStream non-Automan liquidity management tests', function () {
  const amm = AutomatedMarketMakerEnum.enum.SLIPSTREAM;
  const chainId = ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID;
  const positionId = 327662n;
  const blockNumber = 18052633n;
  const tickSpacing = 1;
  // Owner of position id `positionId` as of `blockNumber`.
  const eoa = '0x2ECA43Dff20D7026fB26A9a3aD03CD275d44E4dC';
  // A Binance hot wallet address that holds a large amount of ETH and USDC on Base mainnet.
  const WHALE_ADDRESS = '0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A';
  const TOKEN0_ADDRESS = '0x4200000000000000000000000000000000000006';
  const TOKEN1_ADDRESS = '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452';
  let TOKEN0: Token, TOKEN1: Token;
  let testClient: TestClient;
  let publicClient: PublicClient;

  let token0Contract: GetContractReturnType<
      typeof IERC20__factory.abi,
      PublicClient
    >,
    token1Contract: GetContractReturnType<
      typeof IERC20__factory.abi,
      PublicClient
    >;

  let token0BalanceBefore: bigint,
    token1BalanceBefore: bigint,
    nativeEtherBalanceBefore: bigint;
  let positionBasicInfo: BasicPositionInfo;
  let positionColletableTokenAmounts: {
    token0Amount: CurrencyAmount<Token>;
    token1Amount: CurrencyAmount<Token>;
  };

  beforeEach(async function () {
    testClient = await hre.viem.getTestClient();
    publicClient = await hre.viem.getPublicClient();
    await resetFork(testClient, blockNumber, process.env.BASE_RPC_URL);

    const impersonatedWhaleSigner =
      await ethers.getImpersonatedSigner(WHALE_ADDRESS);
    await impersonatedWhaleSigner.sendTransaction({
      to: eoa,
      value: parseEther('10'),
    });

    token0Contract = getContract({
      address: TOKEN0_ADDRESS,
      abi: IERC20__factory.abi,
      client: publicClient,
    });

    token1Contract = getContract({
      address: TOKEN1_ADDRESS,
      abi: IERC20__factory.abi,
      client: publicClient,
    });

    token0BalanceBefore = await token0Contract.read.balanceOf([eoa]);
    token1BalanceBefore = await token1Contract.read.balanceOf([eoa]);
    nativeEtherBalanceBefore = await publicClient.getBalance({
      address: eoa,
    });
    positionBasicInfo = await getBasicPositionInfo(
      chainId,
      amm,
      positionId,
      publicClient,
    );

    positionColletableTokenAmounts = await viewCollectableTokenAmounts(
      chainId,
      amm,
      positionId,
      publicClient,
    );

    TOKEN0 = await getToken(TOKEN0_ADDRESS, chainId, publicClient);
    TOKEN1 = await getToken(TOKEN1_ADDRESS, chainId, publicClient);
  });

  it('Collect fees', async function () {
    const txRequest = await getCollectTx(
      positionId,
      eoa,
      chainId,
      amm,
      publicClient,
      false,
      positionBasicInfo,
    );

    const eoaSigner = await ethers.getImpersonatedSigner(eoa);
    const txReceipt = await (await eoaSigner.sendTransaction(txRequest)).wait();

    const collectedFees = getCollectedFeesFromReceipt(
      txReceipt,
      positionBasicInfo.token0,
      positionBasicInfo.token1,
    );
    expect(collectedFees).deep.equal(positionColletableTokenAmounts);

    expect(await token0Contract.read.balanceOf([eoa])).to.equal(
      token0BalanceBefore +
        BigInt(collectedFees.token0Amount.quotient.toString()),
    );
    expect(await token1Contract.read.balanceOf([eoa])).to.equal(
      token1BalanceBefore +
        BigInt(collectedFees.token1Amount.quotient.toString()),
    );
  });

  it('Decrease liquidity, increase liquidity, and create position', async function () {
    // ------- Decrease Liquidity -------
    const position = await getPositionFromBasicInfo(
      positionBasicInfo,
      chainId,
      amm,
      publicClient,
    );
    const liquidityPercentage = new Percent(1); // 100%
    const removeLiquidityTxRequest = await getRemoveLiquidityTx(
      {
        tokenId: positionId.toString(),
        liquidityPercentage,
        slippageTolerance: new Percent(1, 100),
        deadline: Math.floor(Date.now() / 1000),
      },
      eoa,
      chainId,
      amm,
      publicClient,
      /*receiveNativeEtherIfApplicable=*/ true,
      position,
    );
    const eoaSigner = await ethers.getImpersonatedSigner(eoa);
    const removeLiquidityTxReceipt = await (
      await eoaSigner.sendTransaction(removeLiquidityTxRequest)
    ).wait();
    const collectedFees = getCollectedFeesFromReceipt(
      removeLiquidityTxReceipt,
      positionBasicInfo.token0,
      positionBasicInfo.token1,
    );
    expect(collectedFees).deep.equal(positionColletableTokenAmounts);
    expect(await token1Contract.read.balanceOf([eoa])).to.equal(
      token1BalanceBefore +
        // Add collected token1 fees.
        BigInt(
          positionColletableTokenAmounts.token1Amount.quotient.toString(),
        ) +
        // Add withdrawn token1 liquidity.
        BigInt(position.amount1.quotient.toString()),
    );
    expect(
      await publicClient.getBalance({
        address: eoa,
      }),
    ).to.equal(
      nativeEtherBalanceBefore +
        // Add collected WETH fees.
        BigInt(
          positionColletableTokenAmounts.token0Amount.quotient.toString(),
        ) +
        // Add withdrawn WETH liquidity.
        BigInt(position.amount0.quotient.toString()) -
        // Subtract gas paid in ETH.
        BigInt(
          removeLiquidityTxReceipt.gasUsed.mul(
            removeLiquidityTxReceipt.effectiveGasPrice,
          ),
        ),
    );

    // ------- Add Liquidity -------
    // We now start to add some liquidity to position id 4.
    // This involves three steps:
    // (1) Figure out the amount of liquidity that can be minted with the provided amounts of the two tokens.
    // (2) Approve the two tokens for Uniswap NPM contract to spend, if necessary.
    // (3) Send out the tx that adds liquidity.

    // Here we want to provide 1 WETH along with the necessary token1 (Lido wstETH) amount.
    const WETH = TOKEN0;
    const oneWETH = getCurrencyAmount(WETH, '1');
    // We find the necessary amount of token1 to pair with 1 WETH.
    // Since WETH is token0 in the pool, we use `Position.fromAmount0()`.
    const token1RawAmount = Position.fromAmount0({
      pool: position.pool,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      amount0: oneWETH.quotient,
      useFullPrecision: true,
    }).mintAmounts.amount0;
    // Now we find the liquidity amount that can be added by providing 1 WETH and `token1RawAmount` of token1.
    const liquidityToAdd = Position.fromAmounts({
      pool: position.pool,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      amount0: oneWETH.quotient,
      amount1: token1RawAmount,
      useFullPrecision: false,
    }).liquidity;

    // Approve Uniswap NPM to spend token1. Since we are providing native ether in this test case, we don't need to approve WETH.
    await IERC20__factory.connect(TOKEN1_ADDRESS, eoaSigner).approve(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      token1RawAmount.toString(),
    );

    // Fund `eoa` with 10 wstETH (token1).
    const token1Whale = await ethers.getImpersonatedSigner(
      '0x31b7538090C8584FED3a053FD183E202c26f9a3e',
    );
    await IERC20__factory.connect(TOKEN1_ADDRESS, token1Whale).transfer(
      eoa,
      parseEther('10'),
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
    expect(
      (await getBasicPositionInfo(chainId, amm, positionId, publicClient))
        .liquidity!,
    ).to.equal(liquidityToAdd.toString());

    // ------- Create Position -------
    // Now we create a new WETH-wstETH (tick spacing 1) position.
    // And we want to provide 1 wstETH paired with the necessary amount of WETH.

    // First, we align the price range's endpoints.
    const alignedPriceLower = alignPriceToClosestUsableTickWithTickSpacing(
      parsePrice(WETH, TOKEN1, '0.95'),
      tickSpacing,
    );
    const alignedPriceUpper = alignPriceToClosestUsableTickWithTickSpacing(
      parsePrice(WETH, TOKEN1, '1.1'),
      tickSpacing,
    );
    expect(alignedPriceLower.toFixed(6)).to.equal('0.949996');
    expect(alignedPriceUpper.toFixed(6)).to.equal('1.099984');

    // Second, we construct the `Position` object for the position we want to create.
    // We want to provide 1 wstETH and the necessary amount of WETH.
    const token1Amount = getCurrencyAmount(TOKEN1, '1');
    const tickLower = priceToClosestTick(alignedPriceLower);
    const tickUpper = priceToClosestTick(alignedPriceUpper);
    const pool = await getPool(
      TOKEN1,
      WETH,
      tickSpacing,
      chainId,
      amm,
      publicClient,
    );
    console.log(pool);
    const positionToCreate = Position.fromAmount1({
      pool,
      tickLower,
      tickUpper,
      amount1: token1Amount.quotient,
    });
    // Now we know that we need to provide 0.1 WBTC and 0.568256298587835347 WETH.
    expect(
      CurrencyAmount.fromRawAmount(
        TOKEN0,
        positionToCreate.mintAmounts.amount0,
      ).toExact(),
    ).to.equal('1');
    expect(
      CurrencyAmount.fromRawAmount(
        TOKEN1,
        positionToCreate.mintAmounts.amount1,
      ).toExact(),
    ).to.equal('0.568256298587835347');

    // Approve Uniswap NPM to spend WBTC.
    await IERC20__factory.connect(TOKEN1_ADDRESS, eoaSigner).approve(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      positionToCreate.mintAmounts.amount0.toString(),
    );

    // Approve Uniswap NPM to spend WETH.
    await WETH__factory.connect(TOKEN0_ADDRESS, eoaSigner).deposit({
      value: positionToCreate.mintAmounts.amount1.toString(),
    });
    await WETH__factory.connect(TOKEN0_ADDRESS, eoaSigner).approve(
      getAMMInfo(chainId, amm)!.nonfungiblePositionManager,
      positionToCreate.mintAmounts.amount1.toString(),
    );

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
      token0: TOKEN0,
      token1: TOKEN1,
      tickSpacing: positionToCreate.pool.tickSpacing,
    });
  });
});
