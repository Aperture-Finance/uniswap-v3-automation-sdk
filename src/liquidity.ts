import Big from 'big.js';

export const FixedPoint96 = {
  Q96: Big(2).pow(96),
};

function getAmount0ForLiquidity(
  sqrtRatioAX96: Big,
  sqrtRatioBX96: Big,
  liquidity: Big,
) {
  if (sqrtRatioAX96.gt(sqrtRatioBX96)) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }
  const numerator = liquidity
    .mul(FixedPoint96.Q96)
    .mul(sqrtRatioBX96.sub(sqrtRatioAX96));
  return numerator.div(sqrtRatioBX96).div(sqrtRatioAX96);
}

function getAmount1ForLiquidity(
  sqrtRatioAX96: Big,
  sqrtRatioBX96: Big,
  liquidity: Big,
) {
  if (sqrtRatioAX96.gt(sqrtRatioBX96)) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }
  return liquidity.mul(sqrtRatioBX96.sub(sqrtRatioAX96)).div(FixedPoint96.Q96);
}

export function getAmountsForLiquidity(
  sqrtRatioX96: Big,
  sqrtRatioAX96: Big,
  sqrtRatioBX96: Big,
  liquidity: Big,
) {
  let amount0 = Big(0);
  let amount1 = Big(0);

  if (sqrtRatioAX96.gt(sqrtRatioBX96)) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  if (sqrtRatioX96.lte(sqrtRatioAX96)) {
    amount0 = getAmount0ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity);
  } else if (sqrtRatioX96.lt(sqrtRatioBX96)) {
    amount0 = getAmount0ForLiquidity(sqrtRatioX96, sqrtRatioBX96, liquidity);
    amount1 = getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioX96, liquidity);
  } else {
    amount1 = getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity);
  }

  return [amount0.toFixed(0), amount1.toFixed(0)];
}
