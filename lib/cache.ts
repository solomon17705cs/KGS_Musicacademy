import { Platform } from 'react-native';

const CACHE_PREFIX = '@appcache_';
const DEFAULT_TTL = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryStore: Record<string, string> = {};

const storage = Platform.OS === 'web'
  ? {
      getItem: async (key: string) => memoryStore[key] ?? null,
      setItem: async (key: string, value: string) => { memoryStore[key] = value; },
      removeItem: async (key: string) => { delete memoryStore[key]; },
      getAllKeys: async () => Object.keys(memoryStore),
      multiRemove: async (keys: string[]) => { keys.forEach(k => delete memoryStore[k]); },
    }
  : require('@react-native-async-storage/async-storage').default;

export const cacheService = {
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const raw = await storage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  },

  async set(key: string, data: unknown): Promise<void> {
    const entry: CacheEntry<unknown> = { data, timestamp: Date.now() };
    await storage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  },

  async isExpired(key: string, ttl: number = DEFAULT_TTL): Promise<boolean> {
    const cached = await this.get(key);
    if (!cached) return true;
    return Date.now() - cached.timestamp > ttl;
  },

  async getFresh<T>(key: string, ttl: number = DEFAULT_TTL): Promise<{ data: T } | null> {
    const cached = await this.get<T>(key);
    if (cached && Date.now() - cached.timestamp <= ttl) {
      return { data: cached.data };
    }
    return null;
  },

  async setAndRefresh(key: string, data: unknown): Promise<void> {
    await this.set(key, data);
  },

  async clear(key?: string): Promise<void> {
    if (key) {
      await storage.removeItem(CACHE_PREFIX + key);
    } else {
      const keys = await storage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await storage.multiRemove(cacheKeys);
      }
    }
  },

  async clearByPrefix(prefix: string): Promise<void> {
    const keys = await storage.getAllKeys();
    const matchKeys = keys.filter(k => k.startsWith(CACHE_PREFIX + prefix));
    if (matchKeys.length > 0) {
      await storage.multiRemove(matchKeys);
    }
  },
};
