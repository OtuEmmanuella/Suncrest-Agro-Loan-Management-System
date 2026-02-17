// lib/cache.ts

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class Cache {
  private cache: Map<string, CacheItem<any>> = new Map();

  set<T>(key: string, data: T, expiresInMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: expiresInMs,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    const age = Date.now() - item.timestamp;
    
    if (age > item.expiresIn) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    const age = Date.now() - item.timestamp;
    if (age > item.expiresIn) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

export const cache = new Cache();

// Helper function for cached queries
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  expiresInMs: number = 5 * 60 * 1000
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    console.log(`Cache HIT: ${key}`);
    return cached;
  }

  console.log(`Cache MISS: ${key}`);
  // Fetch fresh data
  const data = await queryFn();
  
  // Store in cache
  cache.set(key, data, expiresInMs);
  
  return data;
}