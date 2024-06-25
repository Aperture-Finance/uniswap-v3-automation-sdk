import { iocContainer } from './IoCContainer';

interface ILogger {
  log(message: string): void;
}

export class ConsoleLogger implements ILogger {
  log(message: string): void {
    console.log(`[ConsoleLogger] ${message}`);
  }
}

export const getLogger = () => {
  return iocContainer.resolve<ILogger>('logger');
};
