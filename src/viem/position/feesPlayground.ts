// ts-node src/viem/position/feesPlayground.ts

import { AutomatedMarketMakerEnum } from "aperture-lens/dist/src/viem";
import { PositionDetails, viewCollectableTokenAmounts } from "./position";
import { getPublicClient } from "../public_client";
import { ApertureSupportedChainId } from "@/interfaces";
import { MAX_FEE_PIPS } from "../automan/getFees";

async function main() {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const amm = AutomatedMarketMakerEnum.Enum.UNISWAP_V3;
    const positionId = 3303237n;
    const client = getPublicClient(chainId);
    
    const { pool, fee, tickLower, tickUpper, position } = await PositionDetails.fromPositionId(
        chainId,
        amm,
        positionId,
        client
    );
    console.log(`pool=${pool}`);
    console.log(`fee=${fee}`);
    console.log(`tickLower=${tickLower}`);
    console.log(`tickUpper=${tickUpper}`);
    console.log(`position=${position}`);
    console.log(`position.amount0.currency.decimals=${position.amount0.currency.decimals}`);
    console.log(`position.amount1.currency.decimals=${position.amount1.currency.decimals}`);
    console.log(`tommyamount0 = ${position.amount0.toSignificant()}`);
    console.log(`tommyamount1 = ${position.amount1.toSignificant()}`);
    const collectableTokenAmounts = await viewCollectableTokenAmounts(chainId, amm, positionId, client, undefined);
    console.log(`tommyamount0 collectable=${collectableTokenAmounts.token0Amount.toSignificant()}`);
    console.log(`tommyamount1 collectable=${collectableTokenAmounts.token1Amount.toSignificant()}`);
    // percentage /bips should be 0.001 for 0.1%, but it gets applied to the principal amount
    // so fee = min(token0fee * 0.001 / amount0, token0fee * 0.001 / amount1)
    const t0 = collectableTokenAmounts.token0Amount.divide(position.amount0);
    const t1 = collectableTokenAmounts.token1Amount.divide(position.amount1);
    console.log(`collectable0/amount0.toSignificant()=${t0.toSignificant()}`);
    console.log(`collectable1/amount1.toSignificant()=${t1.toSignificant()}`);
    console.log(`10^position.amount0.currency.decimals=${10**position.amount0.currency.decimals}`);
    console.log(`t0*decimals.toSignificant()=${t0.multiply(10**position.amount0.currency.decimals).toSignificant()}`);
    console.log(`t1*decimals.toSignificant()=${t1.multiply(10**position.amount1.currency.decimals).toSignificant()}`);
    console.log(`t0 fee percent=${collectableTokenAmounts.token0Amount.divide(position.amount0).multiply(.07*10**position.amount0.currency.decimals).toSignificant()}`);
    console.log(`t1 fee percent=${collectableTokenAmounts.token1Amount.divide(position.amount1).multiply(.07*10**position.amount1.currency.decimals).toSignificant()}`);
    console.log(`t0 fee percent=${collectableTokenAmounts.token0Amount.multiply(.07*10**position.amount0.currency.decimals).divide(position.amount0).toSignificant()}`);
    console.log(`t1 fee percent=${collectableTokenAmounts.token1Amount.multiply(.07*10**position.amount1.currency.decimals).divide(position.amount1).toSignificant()}`);
    console.log(`t1 fee percent=${Number(collectableTokenAmounts.token1Amount.multiply(.07*10**position.amount1.currency.decimals).divide(position.amount1).toSignificant())}`);
    console.log(`t1 fee percent=${Number(collectableTokenAmounts.token1Amount.multiply(.07*10**position.amount1.currency.decimals).divide(position.amount1))}`);
    console.log(`t1 fee percent=${BigInt(collectableTokenAmounts.token1Amount.multiply(.07*10**position.amount1.currency.decimals).divide(position.amount1).toSignificant()) * MAX_FEE_PIPS}`);
    console.log(`t1 fee percent=${BigInt(collectableTokenAmounts.token1Amount.multiply(.07*10**position.amount1.currency.decimals).divide(position.amount1).toSignificant()) * MAX_FEE_PIPS}`);
}

main();