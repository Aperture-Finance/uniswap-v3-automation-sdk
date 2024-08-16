// ts-node src/viem/position/feesPlayground.ts
import { ApertureSupportedChainId } from '@/interfaces';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { floor } from 'lodash';

import { getPublicClient } from '../public_client';
import { PositionDetails, viewCollectableTokenAmounts } from './position';

async function main() {
  const chainId = ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID;
  const amm = AutomatedMarketMakerEnum.Enum.UNISWAP_V3;
  const positionId = 3356299n;
  const client = getPublicClient(chainId);

  const { pool, fee, tickLower, tickUpper, position } =
    await PositionDetails.fromPositionId(chainId, amm, positionId, client);
  console.log(`pool=${JSON.stringify(pool)}`);
  console.log(`fee=${fee}`);
  console.log(`tickLower=${tickLower}`);
  console.log(`tickUpper=${tickUpper}`);
  console.log(`position=${JSON.stringify(position)}`);
  console.log(
    `position.amount0.currency.decimals=${position.amount0.currency.decimals}`,
  );
  console.log(
    `position.amount1.currency.decimals=${position.amount1.currency.decimals}`,
  );
  console.log(`amount0 = ${position.amount0.toSignificant()}`);
  console.log(`amount1 = ${position.amount1.toSignificant()}`);
  const collectableTokenAmounts = await viewCollectableTokenAmounts(
    chainId,
    amm,
    positionId,
    client,
    undefined,
  );
  console.log(
    `collectable0=${collectableTokenAmounts.token0Amount.toSignificant()}`,
  );
  console.log(
    `collectable1=${collectableTokenAmounts.token1Amount.toSignificant()}`,
  );
  // percentage /bips should be 0.001 for 0.1%, but it gets applied to the principal amount
  // so fee = min(token0fee * 0.001 / amount0, token0fee * 0.001 / amount1)
  const fee0 = collectableTokenAmounts.token0Amount.divide(position.amount0);
  const fee1 = collectableTokenAmounts.token1Amount.divide(position.amount1);
  console.log(`collectable0/amount0.toSignificant()=${fee0.toSignificant()}`);
  console.log(`collectable1/amount1.toSignificant()=${fee1.toSignificant()}`);
  console.log(
    `10**position.amount0.currency.decimals=${10 ** position.amount0.currency.decimals}`,
  );
  console.log(
    `collectable0/amount0*decimals.toSignificant()=${fee0.multiply(10 ** position.amount0.currency.decimals).toSignificant()}`,
  );
  console.log(
    `collectable1/amount1*decimals.toSignificant()=${fee0.multiply(10 ** position.amount1.currency.decimals).toSignificant()}`,
  );
  console.log(
    `collectable0/amount0*fee*decimals=${collectableTokenAmounts.token0Amount
      .divide(position.amount0)
      .multiply(0.07 * 10 ** position.amount0.currency.decimals)
      .toSignificant()}`,
  );
  console.log(
    `collectable1/amount1*fee*decimals=${collectableTokenAmounts.token1Amount
      .divide(position.amount1)
      .multiply(0.07 * 10 ** position.amount1.currency.decimals)
      .toSignificant()}`,
  );
  console.log(
    `collectable0*fee*decimals/amount0=${collectableTokenAmounts.token0Amount
      .multiply(0.07 * 10 ** position.amount0.currency.decimals)
      .divide(position.amount0)
      .toSignificant()}`,
  );
  console.log(
    `collectable1*fee*decimals/amount1=${collectableTokenAmounts.token1Amount
      .multiply(0.07 * 10 ** position.amount1.currency.decimals)
      .divide(position.amount1)
      .toSignificant()}`,
  );
  console.log(
    `number(collectable1*fee*decimals/amount1.toSignif)=${Number(
      collectableTokenAmounts.token1Amount
        .multiply(0.07 * 10 ** position.amount1.currency.decimals)
        .divide(position.amount1)
        .toSignificant(),
    )}`,
  );
  console.log(
    `number(collectable1*fee*decimals/amount1)=${Number(collectableTokenAmounts.token1Amount.multiply(0.07 * 10 ** position.amount1.currency.decimals).divide(position.amount1))}`,
  );
  console.log(
    `BigInt(floor(number(collectable1*fee*decimals/amount1.toSignif)))=${BigInt(
      floor(
        Number(
          collectableTokenAmounts.token1Amount
            .multiply(0.07 * 10 ** position.amount1.currency.decimals)
            .divide(position.amount1)
            .toSignificant(),
        ) * 1e18,
      ),
    )}`,
  );
}

main();
