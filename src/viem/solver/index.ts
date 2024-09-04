import { get1InchSolver } from './get1InchSolver';
import { getPropellerHeadsSolver } from './getPropellerHeadsSolver';
import { E_Solver, ISolver, SolvedSwapInfo } from './types';

export { quote } from './get1InchSolver'; // TODO: remove when complete refactor

export * from './increaseLiquidityOptimal';
export * from './increaseLiquidityOptimalV2';
export * from './optimalMint';
export * from './optimalMintV2';
export * from './optimalRebalanceV2';
export * from './types';

const defaultSwapInfo: SolvedSwapInfo = {
  swapData: '0x',
};

export const getSolver = (solver: E_Solver): ISolver => {
  switch (solver) {
    case E_Solver.OneInch:
      return get1InchSolver();
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
