// ts-node test/playground/percent.ts
import { Percent } from '@uniswap/sdk-core';

async function main() {
    const percent = new Percent(5, 100123132156351351353);
    console.log(percent.toSignificant());
    console.log(percent.quotient.toString());
    console.log(percent.numerator.toString());
    console.log(percent.denominator.toString());
    console.log(percent.asFraction);
    console.log(Number(percent.toSignificant())/100);
    console.log(Number(percent.numerator)/Number(percent.denominator));
    console.log(BigInt(percent.numerator.toString())/BigInt(percent.denominator.toString()));
}

main();
