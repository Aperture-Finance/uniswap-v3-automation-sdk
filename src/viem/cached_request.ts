class RequestCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private requests: Record<string, Promise<any>>;

  constructor() {
    this.requests = {};
  }

  /**
   * Add a request to cache
   * @param key cache key
   * @param request request function, return a promise
   * @param cacheTimeInSeconds in seconds
   * @returns
   */
  public async addRequest<T>(
    key: string,
    request: () => Promise<T>,
    cacheTimeInSeconds = 4,
  ): Promise<T> {
    if (!this.requests[key]) {
      this.requests[key] = request().finally(() => {
        setTimeout(() => {
          delete this.requests[key];
        }, cacheTimeInSeconds * 1000);
      });
    }
    return this.requests[key];
  }
}

let cachedRequest: RequestCache | undefined;

export const getRequestCache = () => {
  if (!cachedRequest) {
    cachedRequest = new RequestCache();
  }
  return cachedRequest;
};
