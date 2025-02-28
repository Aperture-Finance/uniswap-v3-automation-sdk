// ts-node test/playground/percent.ts
import { Percent } from '@uniswap/sdk-core';
import Big from 'big.js';

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
  const percent = new Percent(5, 100123132156351351353);
  console.log(percent.toSignificant());
  console.log(percent.quotient.toString());
  console.log(percent.numerator.toString());
  console.log(percent.denominator.toString());
  console.log(percent.asFraction);
  console.log(Number(percent.toSignificant()));
  console.log(Number(percent.toSignificant()) / 100);
  console.log(Number(percent.numerator) / Number(percent.denominator)); // Seems the most accurate
  console.log(
    BigInt(percent.numerator.toString()) /
      BigInt(percent.denominator.toString()),
  );
  console.log(percent.numerator.toString());
  console.log(Big(percent.numerator.toString()));
  console.log(
    Number(
      Big(percent.numerator.toString()).div(percent.denominator.toString()),
    ).toString(),
  );
}

main();
