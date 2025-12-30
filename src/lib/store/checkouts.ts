import type { CheckoutSession } from '@/lib/types';

// =============================================================================
// IN-MEMORY CHECKOUT STORE
// In production, use a database (PostgreSQL, Redis, etc.)
// =============================================================================

const checkoutStore = new Map<string, CheckoutSession>();

// Store stats for observability
let totalCreated = 0;
let totalCompleted = 0;
let totalFailed = 0;

export const CheckoutStore = {
  /**
   * Create a new checkout session
   */
  create(session: CheckoutSession): CheckoutSession {
    checkoutStore.set(session.checkout_id, session);
    totalCreated++;
    console.log(`[CheckoutStore] Created checkout: ${session.checkout_id}`);
    return session;
  },

  /**
   * Get checkout by ID
   */
  get(checkoutId: string): CheckoutSession | undefined {
    return checkoutStore.get(checkoutId);
  },

  /**
   * Update checkout session
   */
  update(checkoutId: string, updates: Partial<CheckoutSession>): CheckoutSession | undefined {
    const existing = checkoutStore.get(checkoutId);
    if (!existing) return undefined;

    const updated: CheckoutSession = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    checkoutStore.set(checkoutId, updated);
    
    // Track completions/failures
    if (updates.status === 'completed') totalCompleted++;
    if (updates.status === 'failed') totalFailed++;
    
    console.log(`[CheckoutStore] Updated checkout: ${checkoutId} -> ${updated.status}`);
    return updated;
  },

  /**
   * Delete checkout (cleanup)
   */
  delete(checkoutId: string): boolean {
    const deleted = checkoutStore.delete(checkoutId);
    if (deleted) {
      console.log(`[CheckoutStore] Deleted checkout: ${checkoutId}`);
    }
    return deleted;
  },

  /**
   * Get store statistics
   */
  getStats() {
    return {
      active_checkouts: checkoutStore.size,
      total_created: totalCreated,
      total_completed: totalCompleted,
      total_failed: totalFailed,
    };
  },

  /**
   * Clear all checkouts (for testing)
   */
  clear() {
    checkoutStore.clear();
    console.log('[CheckoutStore] Cleared all checkouts');
  },
};

