interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class TimedCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private readonly duration: number;

  constructor(durationMs: number) {
    this.cache = new Map();
    this.duration = durationMs;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now - entry.timestamp > this.duration) {
      // Cache expired, remove it
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  set(key: K, value: V): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
    });
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Optional: method to cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.duration) {
        this.cache.delete(key);
      }
    }
  }
}
