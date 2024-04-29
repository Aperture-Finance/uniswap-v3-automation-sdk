class CachedRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private requests: Record<string, Promise<any>>;

  constructor() {
    this.requests = {};
  }

  public async addRequest<T>(
    key: string,
    request: () => Promise<T>,
    cacheTime = 4000,
  ): Promise<T> {
    if (!this.requests[key]) {
      this.requests[key] = request().finally(() => {
        setTimeout(() => {
          delete this.requests[key];
        }, cacheTime);
      });
    }
    return this.requests[key];
  }
}

let cachedRequest: CachedRequest | undefined;

export const getCachedRequest = () => {
  if (!cachedRequest) {
    cachedRequest = new CachedRequest();
  }
  return cachedRequest;
};
