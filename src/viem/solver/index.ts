import { get1InchSolver } from './get1InchSolver';
import { getOkxSolver } from './getOkxSolver';
import { getPropellerHeadsSolver } from './getPropellerHeadsSolver';
import { E_Solver, ISolver, SolvedSwapInfo } from './types';

export { getOkxQuote, getOkxSwap } from './getOkxSolver'; // TODO: remove when complete refactor
export { get1InchQuote } from './get1InchSolver';

export * from './increaseLiquidityOptimal';
export * from './optimalMint';
export * from './optimalRebalance';
export * from './types';

const defaultSwapInfo: SolvedSwapInfo = {
  swapData: '0x',
};

export const getSolver = (solver: E_Solver): ISolver => {
  switch (solver) {
    case E_Solver.OneInch:
      return get1InchSolver();
    case E_Solver.OKX:
      return getOkxSolver();
    case E_Solver.PH:
      return getPropellerHeadsSolver();
    case E_Solver.SamePool:
      return {
        optimalMint: async () => defaultSwapInfo,
      };
    default:
      throw new Error('Invalid solver');
  }
};

export function getIsOkx() {
  return Number(process.env.OKX_RAMPUP_PERCENT || '100') / 100 > Math.random();
}
