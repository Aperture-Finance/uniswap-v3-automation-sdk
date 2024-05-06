import { get1InchSolver } from './get1InchSolver';
import { E_Solver, ISolver, SolvedSwapInfo } from './types';

export { quote, getOptimalMintSwapData } from './get1InchSolver'; // TODO: remove when complete refactor

export * from './types';

const defaultSwapInfo: SolvedSwapInfo = {
  swapData: '0x',
};

export const getSolver = (solver: E_Solver): ISolver => {
  switch (solver) {
    case E_Solver.OneInch:
      return get1InchSolver();
    case E_Solver.PH:
    // TODO: implement
    case E_Solver.SamePool:
      return {
        optimalMint: async () => defaultSwapInfo,
      };
    default:
      throw new Error('Invalid solver');
  }
};
