import { get1InchSolver } from './OneInch';
import { E_Solver, ISolver, SolvedSwapInfo } from './types';

export * from './types';

const defaultSwapInfo: SolvedSwapInfo = {
  swapData: '0x',
};

export const getSolver = (solver: E_Solver): ISolver => {
  switch (solver) {
    case E_Solver.OneInch:
      return get1InchSolver();
    case E_Solver.PH:
    case E_Solver.UNISWAP:
      return {
        rebalance: async () => defaultSwapInfo,
      };
    default:
      throw new Error('Invalid solver');
  }
};
