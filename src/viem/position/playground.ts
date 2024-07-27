// ts-node src/viem/position/playground.ts

import { AutomatedMarketMakerEnum } from "aperture-lens/dist/src/viem";
import { PositionDetails, viewCollectableTokenAmounts } from "./position";
import { getPublicClient } from "../public_client";
import { ApertureSupportedChainId } from "@/interfaces";

async function main() {
    const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
    const amm = AutomatedMarketMakerEnum.Enum.UNISWAP_V3;
    const positionId = 3303237n;
    const client = getPublicClient(chainId);
    
    const { pool, fee, tickLower, tickUpper, position } = await PositionDetails.fromPositionId(
        chainId,
        amm,
        positionId,
        client,
    );
    console.log(pool);
    console.log(fee);
    console.log(tickLower);
    console.log(tickUpper);
    console.log(position);
    console.log('tommyamount0');
    console.log(position.amount0);
    console.log(position.amount0.toSignificant(6));
    console.log(position.amount1);
    console.log(position.amount1.toSignificant(6));
    console.log('tommy2');
    // const collectableTokenAmounts2 = await viewCollectableTokenAmounts(chainId, amm, positionId);
    // console.log(collectableTokenAmounts2);
    const collectableTokenAmounts = await viewCollectableTokenAmounts(chainId, amm, positionId, client);
    console.log(collectableTokenAmounts);
    console.log(collectableTokenAmounts.token0Amount.toSignificant(6));
    console.log(collectableTokenAmounts.token1Amount.toSignificant(6));
    console.log(collectableTokenAmounts.token1Amount.toSignificant());
    // percentage /bips should be 0.001 for 0.1%, but it gets applied to the principal amount
    // so fee = min(token0fee * 0.001 / amount0, token0fee * 0.001 / amount1)
    const t0 = collectableTokenAmounts.token0Amount.multiply(0.001).divide(position.amount0);
    const t1 = collectableTokenAmounts.token1Amount.multiply(0.001).divide(position.amount1);
    console.log(t0);
    console.log(t1);
    console.log(t0 < t1 ? t0 : t1);

}

main();