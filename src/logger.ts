import { ioc } from './ioc';

export interface ILogger {
  debug(message: string, messageContext?: object): void;
  info(message: string, messageContext?: object): void;
  warn(message: string, messageContext?: object): void;
  error(message: string, messageContext?: object): void;
}

export class ConsoleLogger implements ILogger {
  debug(message: string, messageContext?: object): void {
    console.debug(`[ConsoleLogger] ${message}`, messageContext);
  }
  info(message: string, messageContext?: object): void {
    console.info(`[ConsoleLogger] ${message}`, messageContext);
  }
  warn(message: string, messageContext?: object): void {
    console.warn(`[ConsoleLogger] ${message}`, messageContext);
  }
  error(message: string, messageContext?: object): void {
    console.error(`[ConsoleLogger] ${message}`, messageContext);
  }
}

export const IOCKEY_LOGGER = 'ioc_logger';

export const getLogger = () => {
  return ioc.resolve<ILogger>(IOCKEY_LOGGER);
};
