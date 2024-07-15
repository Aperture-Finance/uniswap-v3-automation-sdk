/* eslint-disable @typescript-eslint/no-explicit-any */
type Constructor<T = any> = new (...args: any[]) => T;

// inversion of control container, reference: https://hackernoon.com/beginners-guide-to-inversion-of-control
class IoCContainer {
  private dependencies: { [key: string]: any } = {};

  private singletons: { [key: string]: any } = {};

  register<T>(key: string, constructor: Constructor<T>, ...args: any[]): void {
    this.dependencies[key] = { constructor, args };
  }

  registerSingleton<T>(
    key: string,
    constructor: Constructor<T>,
    ...args: any[]
  ): void {
    this.dependencies[key] = { constructor, args, singleton: true };
  }

  resolve<T>(key: string): T {
    const dependency = this.dependencies[key];
    if (!dependency) {
      throw new Error(`Dependency with key ${key} not found`);
    }

    const { constructor, args, singleton } = dependency;

    if (singleton) {
      if (!this.singletons[key]) {
        this.singletons[key] = new constructor(...args);
      }
      return this.singletons[key];
    }

    return new constructor(...args);
  }
}

export const ioc = new IoCContainer();
