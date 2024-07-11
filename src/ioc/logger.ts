import { ioc } from './IoCContainer';

export interface ILogger {
  log(message: string, messageContext?: object): void;
  error(message: string, messageContext?: object): void;
  warn(message: string, messageContext?: object): void;
}

export class ConsoleLogger implements ILogger {
  log(message: string, messageContext?: object): void {
    console.log(`[ConsoleLogger] ${message}`, messageContext);
  }
  warn(message: string, messageContext?: object): void {
    console.warn(`[ConsoleLogger] ${message}`, messageContext);
  }
  error(message: string, messageContext?: object): void {
    console.error(`[ConsoleLogger] ${message}`, messageContext);
  }
}

export const IOCKEY_LOGGER = 'logger';

export const getLogger = () => {
  return ioc.resolve<ILogger>(IOCKEY_LOGGER);
};
