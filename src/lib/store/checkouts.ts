import { kv } from '@vercel/kv';
import type { CheckoutSession } from '@/lib/types';

// =============================================================================
// REDIS-BACKED CHECKOUT STORE (Vercel KV / Upstash)
// Falls back to in-memory for local development without Redis
// =============================================================================

const CHECKOUT_PREFIX = 'acp_checkout:';
const CHECKOUT_TTL = 60 * 60; // 1 hour TTL for checkouts

// In-memory fallback for local development
const memoryStore = new Map<string, CheckoutSession>();
let useMemoryFallback = false;

// Stats tracking
let totalCreated = 0;
let totalCompleted = 0;
let totalFailed = 0;

export const CheckoutStore = {
  /**
   * Create a new checkout session
   */
  async create(session: CheckoutSession): Promise<CheckoutSession> {
    totalCreated++;
    const key = `${CHECKOUT_PREFIX}${session.checkout_id}`;
    
    try {
      if (!useMemoryFallback && process.env.KV_REST_API_URL) {
        await kv.set(key, JSON.stringify(session), { ex: CHECKOUT_TTL });
        console.log(`[CheckoutStore:Redis] Created checkout: ${session.checkout_id}`);
      } else {
        memoryStore.set(session.checkout_id, session);
        console.log(`[CheckoutStore:Memory] Created checkout: ${session.checkout_id}`);
      }
    } catch (error) {
      console.warn('[CheckoutStore] Redis error, falling back to memory:', error);
      useMemoryFallback = true;
      memoryStore.set(session.checkout_id, session);
    }
    
    return session;
  },

  /**
   * Get checkout by ID
   */
  async get(checkoutId: string): Promise<CheckoutSession | undefined> {
    const key = `${CHECKOUT_PREFIX}${checkoutId}`;
    
    try {
      if (!useMemoryFallback && process.env.KV_REST_API_URL) {
        const data = await kv.get<string>(key);
        if (data) {
          // Handle both string and object responses
          const session = typeof data === 'string' ? JSON.parse(data) : data;
          console.log(`[CheckoutStore:Redis] Retrieved checkout: ${checkoutId}`);
          return session;
        }
        return undefined;
      }
    } catch (error) {
      console.warn('[CheckoutStore] Redis error, falling back to memory:', error);
      useMemoryFallback = true;
    }
    
    return memoryStore.get(checkoutId);
  },

  /**
   * Update checkout session
   */
  async update(checkoutId: string, updates: Partial<CheckoutSession>): Promise<CheckoutSession | undefined> {
    const existing = await this.get(checkoutId);
    if (!existing) return undefined;

    const updated: CheckoutSession = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Track completions/failures
    if (updates.status === 'completed') totalCompleted++;
    if (updates.status === 'failed') totalFailed++;

    const key = `${CHECKOUT_PREFIX}${checkoutId}`;
    
    try {
      if (!useMemoryFallback && process.env.KV_REST_API_URL) {
        await kv.set(key, JSON.stringify(updated), { ex: CHECKOUT_TTL });
        console.log(`[CheckoutStore:Redis] Updated checkout: ${checkoutId} -> ${updated.status}`);
      } else {
        memoryStore.set(checkoutId, updated);
        console.log(`[CheckoutStore:Memory] Updated checkout: ${checkoutId} -> ${updated.status}`);
      }
    } catch (error) {
      console.warn('[CheckoutStore] Redis error, falling back to memory:', error);
      useMemoryFallback = true;
      memoryStore.set(checkoutId, updated);
    }
    
    return updated;
  },

  /**
   * Delete checkout (cleanup)
   */
  async delete(checkoutId: string): Promise<boolean> {
    const key = `${CHECKOUT_PREFIX}${checkoutId}`;
    
    try {
      if (!useMemoryFallback && process.env.KV_REST_API_URL) {
        await kv.del(key);
        console.log(`[CheckoutStore:Redis] Deleted checkout: ${checkoutId}`);
        return true;
      }
    } catch (error) {
      console.warn('[CheckoutStore] Redis error:', error);
    }
    
    const deleted = memoryStore.delete(checkoutId);
    if (deleted) {
      console.log(`[CheckoutStore:Memory] Deleted checkout: ${checkoutId}`);
    }
    return deleted;
  },

  /**
   * Get store statistics
   */
  getStats() {
    return {
      active_checkouts: memoryStore.size,
      total_created: totalCreated,
      total_completed: totalCompleted,
      total_failed: totalFailed,
      storage_type: useMemoryFallback ? 'memory' : (process.env.KV_REST_API_URL ? 'redis' : 'memory'),
    };
  },

  /**
   * Clear all checkouts (for testing)
   */
  async clear() {
    memoryStore.clear();
    console.log('[CheckoutStore] Cleared memory store');
  },
};
