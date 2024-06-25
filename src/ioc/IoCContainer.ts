export class IoCContainer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private dependencies: { [key: string]: any } = {};

  register<T>(key: string, value: T): void {
    this.dependencies[key] = value;
  }

  resolve<T>(key: string): T {
    const dependency = this.dependencies[key];
    if (!dependency) {
      throw new Error(`Dependency ${key} is not registered.`);
    }
    return dependency as T;
  }
}

export const iocContainer = new IoCContainer();
