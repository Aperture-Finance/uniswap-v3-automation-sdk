import { get1InchSolver } from './get1InchSolver';
import { getOkxSolver } from './getOkxSolver';
import { getPropellerHeadsSolver } from './getPropellerHeadsSolver';
import { getSamePoolSolver } from './getSamePoolSolver';
import { E_Solver, ISolver } from './types';

export { getOkxQuote, getOkxSwap } from './getOkxSolver'; // TODO: remove when complete refactor
export { get1InchQuote } from './get1InchSolver';

export * from './increaseLiquidityOptimal';
export * from './mintOptimal';
export * from './rebalanceOptimal';
export * from './reinvest';
export * from './types';

export const getSolver = (solver: E_Solver): ISolver => {
  switch (solver) {
    case E_Solver.OneInch:
      return get1InchSolver();
    case E_Solver.OKX:
      return getOkxSolver();
    case E_Solver.PH:
      return getPropellerHeadsSolver();
    case E_Solver.SamePool:
      return getSamePoolSolver();
    default:
      throw new Error('Invalid solver');
  }
};

export function getIsOkx() {
  return Number(process.env.OKX_RAMPUP_PERCENT || '100') / 100 > Math.random();
}
