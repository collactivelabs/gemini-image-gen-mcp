/**
 * Simple in-memory cache with TTL support
 * Caches generation results to avoid duplicate API calls
 */

export class Cache {
  constructor(ttl = 3600000) { // Default 1 hour TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(prompt, options = {}) {
    const normalized = {
      prompt: prompt.trim().toLowerCase(),
      model: options.model || 'default',
      temperature: options.temperature || 1.0,
      topP: options.topP || 0.95,
      topK: options.topK || 40,
    };
    return JSON.stringify(normalized);
  }

  /**
   * Get cached value if it exists and hasn't expired
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Store value in cache with expiration
   */
  set(key, value) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
      createdAt: Date.now()
    });
  }

  /**
   * Clear expired entries from cache
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.createdAt,
        expiresIn: entry.expiresAt - Date.now()
      }))
    };
  }
}

// Create singleton instance with 30-minute TTL
export const responseCache = new Cache(30 * 60 * 1000);

// Clean up expired entries every 5 minutes
setInterval(() => {
  responseCache.cleanup();
}, 5 * 60 * 1000);
