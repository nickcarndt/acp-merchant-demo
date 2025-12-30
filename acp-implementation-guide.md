# ACP MERCHANT DEMO — IMPLEMENTATION GUIDE
## Step-by-Step Build Instructions for Cursor Pro
### Target Completion: January 5, 2025 | Interview: January 7, 2025

---

## OVERVIEW

This document provides step-by-step implementation instructions for building an ACP-compliant merchant demo. Each phase includes checkpoints to verify progress before moving forward.

**Tech Stack:**
- Runtime: Node.js 18+
- Framework: Next.js 14 (App Router) with TypeScript
- Validation: Zod
- Payments: Stripe SDK
- Deployment: Vercel
- Testing: Manual smoke tests (documented)

**Project Name:** `acp-merchant-demo`
**Target URL:** `https://acp-merchant-demo.vercel.app`

---

## PHASE 0: PROJECT SETUP (30 minutes)

### Step 0.1: Create Next.js Project

```bash
npx create-next-app@latest acp-merchant-demo --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd acp-merchant-demo
```

### Step 0.2: Install Dependencies

```bash
npm install stripe zod uuid
npm install -D @types/uuid
```

### Step 0.3: Create Project Structure

```bash
mkdir -p src/lib/services
mkdir -p src/lib/store
mkdir -p src/lib/schemas
mkdir -p src/lib/types
mkdir -p src/app/api/acp/checkout
mkdir -p src/app/api/acp/webhooks
mkdir -p src/app/api/health
mkdir -p public/.well-known
```

### Step 0.4: Environment Setup

Create `.env.local`:
```bash
# Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# ACP Auth (for demo, use a simple token)
ACP_AUTH_TOKEN=demo_acp_token_12345

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Create `.env.example` (for repo):
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ACP_AUTH_TOKEN=your_token_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 0.5: Initialize Git

```bash
git init
git add .
git commit -m "Initial project setup"
```

### ✅ CHECKPOINT 0
- [ ] Project created and runs with `npm run dev`
- [ ] All folders exist
- [ ] Environment variables configured
- [ ] Git initialized

---

## PHASE 1: TYPE DEFINITIONS (45 minutes)

### Step 1.1: Create Core Types

Create `src/lib/types/acp.ts`:

```typescript
// =============================================================================
// ACP PROTOCOL TYPES
// Based on: https://docs.stripe.com/agentic-commerce/protocol/specification
// =============================================================================

// -----------------------------------------------------------------------------
// Money & Common Types
// -----------------------------------------------------------------------------

export interface Money {
  amount: number;      // Smallest unit (cents for USD)
  currency: string;    // ISO 4217 code (lowercase)
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;     // ISO 3166-1 alpha-2
}

// -----------------------------------------------------------------------------
// Product Types
// -----------------------------------------------------------------------------

export interface Product {
  id: string;
  name: string;
  description: string;
  price: Money;
  images: string[];
  variants?: ProductVariant[];
  in_stock: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  price_adjustment?: Money;  // Added/subtracted from base price
  in_stock: boolean;
}

// -----------------------------------------------------------------------------
// Checkout Types
// -----------------------------------------------------------------------------

export type CheckoutStatus = 
  | 'created'
  | 'pending'
  | 'ready_for_payment'
  | 'processing'
  | 'completed'
  | 'failed';

export interface LineItem {
  product_id: string;
  quantity: number;
  variant_id?: string;
}

export interface ResolvedLineItem extends LineItem {
  name: string;
  unit_price: Money;
  total_price: Money;
  image_url?: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  price: Money;
  estimated_days: {
    min: number;
    max: number;
  };
}

export type RequiredField = 
  | 'shipping_address'
  | 'billing_address'
  | 'email'
  | 'phone'
  | 'shipping_option';

// -----------------------------------------------------------------------------
// Checkout Session
// -----------------------------------------------------------------------------

export interface CheckoutSession {
  // Identifiers
  checkout_id: string;
  checkout_reference_id: string;
  
  // Status
  status: CheckoutStatus;
  created_at: string;
  updated_at: string;
  
  // Items
  line_items: ResolvedLineItem[];
  
  // Pricing
  subtotal: Money;
  shipping_cost?: Money;
  tax?: Money;
  total: Money;
  
  // Selections
  selected_shipping_option?: string;
  shipping_address?: Address;
  billing_address?: Address;
  buyer_email?: string;
  buyer_phone?: string;
  
  // Options
  available_shipping_options: ShippingOption[];
  required_fields: RequiredField[];
  
  // Payment
  payment_intent_id?: string;
  
  // Result
  order_id?: string;
  failure_reason?: string;
  
  // Metadata
  metadata?: Record<string, string>;
}

// -----------------------------------------------------------------------------
// API Request/Response Types
// -----------------------------------------------------------------------------

export interface CreateCheckoutRequest {
  checkout_reference_id: string;
  line_items: LineItem[];
  buyer_context?: {
    locale?: string;
    currency?: string;
    shipping_country?: string;
  };
  metadata?: Record<string, string>;
}

export interface CreateCheckoutResponse {
  checkout_id: string;
  checkout_reference_id: string;
  status: CheckoutStatus;
  line_items: ResolvedLineItem[];
  subtotal: Money;
  total: Money;
  shipping_options: ShippingOption[];
  required_fields: RequiredField[];
}

export interface UpdateCheckoutRequest {
  checkout_id: string;
  shipping_option_id?: string;
  shipping_address?: Address;
  billing_address?: Address;
  buyer_email?: string;
  buyer_phone?: string;
  metadata?: Record<string, string>;
}

export interface UpdateCheckoutResponse {
  checkout_id: string;
  status: CheckoutStatus;
  subtotal: Money;
  shipping_cost?: Money;
  tax?: Money;
  total: Money;
  required_fields: RequiredField[];
  ready_for_payment: boolean;
}

export interface CompleteCheckoutRequest {
  checkout_id: string;
  payment_token: string;
}

export interface CompleteCheckoutResponse {
  checkout_id: string;
  status: 'completed' | 'failed';
  order_id?: string;
  failure_reason?: string;
  receipt_url?: string;
}

// -----------------------------------------------------------------------------
// Webhook Types
// -----------------------------------------------------------------------------

export interface ACPWebhookEvent {
  type: string;
  data: {
    checkout_id: string;
    order_id?: string;
    status?: string;
    [key: string]: unknown;
  };
  timestamp: string;
}

// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------

export interface ACPError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### Step 1.2: Create Zod Schemas

Create `src/lib/schemas/acp.ts`:

```typescript
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Common Schemas
// -----------------------------------------------------------------------------

export const MoneySchema = z.object({
  amount: z.number().int().min(0),
  currency: z.string().length(3).toLowerCase(),
});

export const AddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postal_code: z.string().min(1),
  country: z.string().length(2).toUpperCase(),
});

// -----------------------------------------------------------------------------
// Request Schemas
// -----------------------------------------------------------------------------

export const LineItemSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  variant_id: z.string().optional(),
});

export const CreateCheckoutRequestSchema = z.object({
  checkout_reference_id: z.string().min(1).max(255),
  line_items: z.array(LineItemSchema).min(1).max(50),
  buyer_context: z.object({
    locale: z.string().optional(),
    currency: z.string().length(3).optional(),
    shipping_country: z.string().length(2).optional(),
  }).optional(),
  metadata: z.record(z.string()).optional(),
});

export const UpdateCheckoutRequestSchema = z.object({
  checkout_id: z.string().min(1),
  shipping_option_id: z.string().optional(),
  shipping_address: AddressSchema.optional(),
  billing_address: AddressSchema.optional(),
  buyer_email: z.string().email().optional(),
  buyer_phone: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export const CompleteCheckoutRequestSchema = z.object({
  checkout_id: z.string().min(1),
  payment_token: z.string().min(1),
});

// -----------------------------------------------------------------------------
// Type Exports (inferred from schemas)
// -----------------------------------------------------------------------------

export type CreateCheckoutRequestInput = z.infer<typeof CreateCheckoutRequestSchema>;
export type UpdateCheckoutRequestInput = z.infer<typeof UpdateCheckoutRequestSchema>;
export type CompleteCheckoutRequestInput = z.infer<typeof CompleteCheckoutRequestSchema>;
```

### Step 1.3: Export Types

Create `src/lib/types/index.ts`:

```typescript
export * from './acp';
```

Create `src/lib/schemas/index.ts`:

```typescript
export * from './acp';
```

### ✅ CHECKPOINT 1
- [ ] All type files created
- [ ] No TypeScript errors (`npm run build` passes)
- [ ] Schemas can be imported

**Test:**
```typescript
// Add to any file temporarily to verify
import { CreateCheckoutRequestSchema } from '@/lib/schemas';
import type { CheckoutSession } from '@/lib/types';
console.log('Types loaded successfully');
```

---

## PHASE 2: PRODUCT CATALOG & STORE (45 minutes)

### Step 2.1: Create Product Catalog

Create `src/lib/services/products.ts`:

```typescript
import type { Product, ShippingOption } from '@/lib/types';

// =============================================================================
// DEMO PRODUCT CATALOG
// In production, this would connect to Shopify, your database, etc.
// =============================================================================

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'prod_running_shoe',
    name: 'Performance Running Shoe',
    description: 'Lightweight running shoe with responsive cushioning for daily training.',
    price: { amount: 12999, currency: 'usd' },
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
    in_stock: true,
    variants: [
      { id: 'var_size_8', name: 'Size 8', in_stock: true },
      { id: 'var_size_9', name: 'Size 9', in_stock: true },
      { id: 'var_size_10', name: 'Size 10', in_stock: true },
      { id: 'var_size_11', name: 'Size 11', in_stock: false },
    ],
  },
  {
    id: 'prod_wireless_earbuds',
    name: 'Pro Wireless Earbuds',
    description: 'Active noise cancellation with 24-hour battery life.',
    price: { amount: 19999, currency: 'usd' },
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400'],
    in_stock: true,
    variants: [
      { id: 'var_color_black', name: 'Midnight Black', in_stock: true },
      { id: 'var_color_white', name: 'Pearl White', in_stock: true },
    ],
  },
  {
    id: 'prod_laptop_stand',
    name: 'Ergonomic Laptop Stand',
    description: 'Aluminum laptop stand with adjustable height for better posture.',
    price: { amount: 7999, currency: 'usd' },
    images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400'],
    in_stock: true,
  },
  {
    id: 'prod_water_bottle',
    name: 'Insulated Water Bottle',
    description: '32oz stainless steel bottle, keeps drinks cold for 24 hours.',
    price: { amount: 3499, currency: 'usd' },
    images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400'],
    in_stock: true,
    variants: [
      { id: 'var_color_blue', name: 'Ocean Blue', in_stock: true },
      { id: 'var_color_green', name: 'Forest Green', in_stock: true },
      { id: 'var_color_black', name: 'Matte Black', in_stock: true },
    ],
  },
];

export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: 'ship_standard',
    name: 'Standard Shipping',
    description: 'Delivered in 5-7 business days',
    price: { amount: 599, currency: 'usd' },
    estimated_days: { min: 5, max: 7 },
  },
  {
    id: 'ship_express',
    name: 'Express Shipping',
    description: 'Delivered in 2-3 business days',
    price: { amount: 1299, currency: 'usd' },
    estimated_days: { min: 2, max: 3 },
  },
  {
    id: 'ship_overnight',
    name: 'Overnight Shipping',
    description: 'Delivered next business day',
    price: { amount: 2499, currency: 'usd' },
    estimated_days: { min: 1, max: 1 },
  },
];

// =============================================================================
// PRODUCT SERVICE FUNCTIONS
// =============================================================================

export function getProductById(productId: string): Product | undefined {
  return DEMO_PRODUCTS.find(p => p.id === productId);
}

export function getProductVariant(product: Product, variantId: string) {
  return product.variants?.find(v => v.id === variantId);
}

export function getAllProducts(): Product[] {
  return DEMO_PRODUCTS;
}

export function getShippingOptions(): ShippingOption[] {
  return SHIPPING_OPTIONS;
}

export function getShippingOptionById(optionId: string): ShippingOption | undefined {
  return SHIPPING_OPTIONS.find(o => o.id === optionId);
}
```

### Step 2.2: Create Checkout Store

Create `src/lib/store/checkouts.ts`:

```typescript
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
```

### ✅ CHECKPOINT 2
- [ ] Products can be retrieved by ID
- [ ] Checkout store can create/read/update
- [ ] No TypeScript errors

**Test in Node REPL or temporary file:**
```typescript
import { getProductById, DEMO_PRODUCTS } from '@/lib/services/products';
import { CheckoutStore } from '@/lib/store/checkouts';

console.log('Products:', DEMO_PRODUCTS.length);
console.log('First product:', getProductById('prod_running_shoe')?.name);
console.log('Store stats:', CheckoutStore.getStats());
```

---

## PHASE 3: CHECKOUT SERVICE (1 hour)

### Step 3.1: Create Checkout Service

Create `src/lib/services/checkout.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import type {
  CheckoutSession,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  UpdateCheckoutRequest,
  UpdateCheckoutResponse,
  ResolvedLineItem,
  Money,
  RequiredField,
} from '@/lib/types';
import { CheckoutStore } from '@/lib/store/checkouts';
import {
  getProductById,
  getProductVariant,
  getShippingOptions,
  getShippingOptionById,
} from './products';

// =============================================================================
// CHECKOUT SERVICE
// Core business logic for ACP checkout flow
// =============================================================================

export class CheckoutService {
  /**
   * Create a new checkout session
   */
  static createCheckout(request: CreateCheckoutRequest): CreateCheckoutResponse {
    // Resolve line items (validate products exist, calculate prices)
    const resolvedItems = this.resolveLineItems(request.line_items);
    
    // Calculate subtotal
    const subtotal = this.calculateSubtotal(resolvedItems);
    
    // Determine required fields
    const requiredFields: RequiredField[] = [
      'shipping_address',
      'email',
      'shipping_option',
    ];
    
    // Create checkout session
    const session: CheckoutSession = {
      checkout_id: `chk_${uuidv4().replace(/-/g, '').slice(0, 24)}`,
      checkout_reference_id: request.checkout_reference_id,
      status: 'created',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: resolvedItems,
      subtotal,
      total: subtotal, // Will be updated when shipping is selected
      available_shipping_options: getShippingOptions(),
      required_fields: requiredFields,
      metadata: request.metadata,
    };
    
    // Store the session
    CheckoutStore.create(session);
    
    // Return response
    return {
      checkout_id: session.checkout_id,
      checkout_reference_id: session.checkout_reference_id,
      status: session.status,
      line_items: session.line_items,
      subtotal: session.subtotal,
      total: session.total,
      shipping_options: session.available_shipping_options,
      required_fields: session.required_fields,
    };
  }

  /**
   * Update an existing checkout session
   */
  static updateCheckout(request: UpdateCheckoutRequest): UpdateCheckoutResponse {
    const session = CheckoutStore.get(request.checkout_id);
    if (!session) {
      throw new Error(`Checkout not found: ${request.checkout_id}`);
    }
    
    // Build updates object
    const updates: Partial<CheckoutSession> = {};
    
    // Handle shipping option selection
    if (request.shipping_option_id) {
      const shippingOption = getShippingOptionById(request.shipping_option_id);
      if (!shippingOption) {
        throw new Error(`Invalid shipping option: ${request.shipping_option_id}`);
      }
      updates.selected_shipping_option = request.shipping_option_id;
      updates.shipping_cost = shippingOption.price;
    }
    
    // Handle address updates
    if (request.shipping_address) {
      updates.shipping_address = request.shipping_address;
    }
    if (request.billing_address) {
      updates.billing_address = request.billing_address;
    }
    
    // Handle contact info
    if (request.buyer_email) {
      updates.buyer_email = request.buyer_email;
    }
    if (request.buyer_phone) {
      updates.buyer_phone = request.buyer_phone;
    }
    
    // Handle metadata
    if (request.metadata) {
      updates.metadata = { ...session.metadata, ...request.metadata };
    }
    
    // Apply updates
    const updatedSession = CheckoutStore.update(request.checkout_id, updates);
    if (!updatedSession) {
      throw new Error('Failed to update checkout');
    }
    
    // Recalculate total
    const total = this.calculateTotal(updatedSession);
    CheckoutStore.update(request.checkout_id, { total });
    
    // Determine remaining required fields
    const remainingRequired = this.getRemainingRequiredFields(updatedSession);
    CheckoutStore.update(request.checkout_id, { 
      required_fields: remainingRequired,
      status: remainingRequired.length === 0 ? 'ready_for_payment' : 'pending',
    });
    
    // Get final session state
    const finalSession = CheckoutStore.get(request.checkout_id)!;
    
    return {
      checkout_id: finalSession.checkout_id,
      status: finalSession.status,
      subtotal: finalSession.subtotal,
      shipping_cost: finalSession.shipping_cost,
      tax: finalSession.tax,
      total: this.calculateTotal(finalSession),
      required_fields: finalSession.required_fields,
      ready_for_payment: finalSession.required_fields.length === 0,
    };
  }

  /**
   * Get checkout session by ID
   */
  static getCheckout(checkoutId: string): CheckoutSession | undefined {
    return CheckoutStore.get(checkoutId);
  }

  /**
   * Mark checkout as processing (payment in progress)
   */
  static markProcessing(checkoutId: string, paymentIntentId: string): void {
    CheckoutStore.update(checkoutId, {
      status: 'processing',
      payment_intent_id: paymentIntentId,
    });
  }

  /**
   * Mark checkout as completed
   */
  static markCompleted(checkoutId: string, orderId: string): void {
    CheckoutStore.update(checkoutId, {
      status: 'completed',
      order_id: orderId,
    });
  }

  /**
   * Mark checkout as failed
   */
  static markFailed(checkoutId: string, reason: string): void {
    CheckoutStore.update(checkoutId, {
      status: 'failed',
      failure_reason: reason,
    });
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  private static resolveLineItems(items: { product_id: string; quantity: number; variant_id?: string }[]): ResolvedLineItem[] {
    return items.map(item => {
      const product = getProductById(item.product_id);
      if (!product) {
        throw new Error(`Product not found: ${item.product_id}`);
      }
      if (!product.in_stock) {
        throw new Error(`Product out of stock: ${item.product_id}`);
      }
      
      // Handle variant
      let variantName = '';
      let priceAdjustment = 0;
      if (item.variant_id && product.variants) {
        const variant = getProductVariant(product, item.variant_id);
        if (!variant) {
          throw new Error(`Variant not found: ${item.variant_id}`);
        }
        if (!variant.in_stock) {
          throw new Error(`Variant out of stock: ${item.variant_id}`);
        }
        variantName = ` - ${variant.name}`;
        priceAdjustment = variant.price_adjustment?.amount || 0;
      }
      
      const unitPrice: Money = {
        amount: product.price.amount + priceAdjustment,
        currency: product.price.currency,
      };
      
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        variant_id: item.variant_id,
        name: product.name + variantName,
        unit_price: unitPrice,
        total_price: {
          amount: unitPrice.amount * item.quantity,
          currency: unitPrice.currency,
        },
        image_url: product.images[0],
      };
    });
  }

  private static calculateSubtotal(items: ResolvedLineItem[]): Money {
    const total = items.reduce((sum, item) => sum + item.total_price.amount, 0);
    return {
      amount: total,
      currency: items[0]?.total_price.currency || 'usd',
    };
  }

  private static calculateTotal(session: CheckoutSession): Money {
    let total = session.subtotal.amount;
    if (session.shipping_cost) {
      total += session.shipping_cost.amount;
    }
    if (session.tax) {
      total += session.tax.amount;
    }
    return {
      amount: total,
      currency: session.subtotal.currency,
    };
  }

  private static getRemainingRequiredFields(session: CheckoutSession): RequiredField[] {
    const remaining: RequiredField[] = [];
    
    if (!session.shipping_address) {
      remaining.push('shipping_address');
    }
    if (!session.buyer_email) {
      remaining.push('email');
    }
    if (!session.selected_shipping_option) {
      remaining.push('shipping_option');
    }
    
    return remaining;
  }
}
```

### ✅ CHECKPOINT 3
- [ ] CheckoutService.createCheckout() works
- [ ] CheckoutService.updateCheckout() works
- [ ] Price calculations are correct
- [ ] Required fields tracking works

**Test:**
```typescript
import { CheckoutService } from '@/lib/services/checkout';

// Test create
const checkout = CheckoutService.createCheckout({
  checkout_reference_id: 'test_ref_123',
  line_items: [
    { product_id: 'prod_running_shoe', quantity: 1, variant_id: 'var_size_10' }
  ],
});
console.log('Created:', checkout);

// Test update
const updated = CheckoutService.updateCheckout({
  checkout_id: checkout.checkout_id,
  shipping_option_id: 'ship_standard',
  buyer_email: 'test@example.com',
  shipping_address: {
    line1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postal_code: '94102',
    country: 'US',
  },
});
console.log('Updated:', updated);
```

---

## PHASE 4: STRIPE PAYMENT SERVICE (45 minutes)

### Step 4.1: Create Stripe Client

Create `src/lib/services/stripe.ts`:

```typescript
import Stripe from 'stripe';

// =============================================================================
// STRIPE CLIENT INITIALIZATION
// =============================================================================

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});
```

### Step 4.2: Create Payment Service

Create `src/lib/services/payment.ts`:

```typescript
import { stripe } from './stripe';
import type { CheckoutSession } from '@/lib/types';

// =============================================================================
// PAYMENT SERVICE
// Handles Stripe PaymentIntent creation and management
// =============================================================================

export class PaymentService {
  /**
   * Create a PaymentIntent for the checkout
   * 
   * In production with real SharedPaymentTokens, you would:
   * 1. Validate the token with Stripe
   * 2. Create PaymentIntent with the token as payment_method
   * 
   * For demo purposes, we simulate this flow.
   */
  static async createPaymentIntent(
    checkout: CheckoutSession,
    paymentToken: string
  ): Promise<{ paymentIntentId: string; status: string; receiptUrl?: string }> {
    console.log(`[PaymentService] Creating PaymentIntent for checkout: ${checkout.checkout_id}`);
    console.log(`[PaymentService] Payment token: ${paymentToken.slice(0, 20)}...`);
    
    try {
      // In a real implementation with SharedPaymentToken:
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: checkout.total.amount,
      //   currency: checkout.total.currency,
      //   payment_method: paymentToken, // SharedPaymentToken
      //   confirm: true,
      //   metadata: {
      //     acp_checkout_id: checkout.checkout_id,
      //     acp_checkout_reference: checkout.checkout_reference_id,
      //   },
      // });

      // For demo: Create a PaymentIntent that can be confirmed later
      // This simulates the flow without requiring a real SharedPaymentToken
      const paymentIntent = await stripe.paymentIntents.create({
        amount: checkout.total.amount,
        currency: checkout.total.currency,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          acp_checkout_id: checkout.checkout_id,
          acp_checkout_reference: checkout.checkout_reference_id,
          demo_mode: 'true',
        },
        description: `ACP Demo Order - ${checkout.line_items.map(i => i.name).join(', ')}`,
      });

      console.log(`[PaymentService] PaymentIntent created: ${paymentIntent.id}`);

      return {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        receiptUrl: undefined, // Would come from successful charge
      };
    } catch (error) {
      console.error('[PaymentService] Error creating PaymentIntent:', error);
      throw error;
    }
  }

  /**
   * Retrieve PaymentIntent status
   */
  static async getPaymentIntentStatus(paymentIntentId: string) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  /**
   * Cancel a PaymentIntent
   */
  static async cancelPaymentIntent(paymentIntentId: string) {
    try {
      await stripe.paymentIntents.cancel(paymentIntentId);
      console.log(`[PaymentService] Cancelled PaymentIntent: ${paymentIntentId}`);
    } catch (error) {
      console.error('[PaymentService] Error cancelling PaymentIntent:', error);
      // Don't throw - cancellation failure shouldn't break the flow
    }
  }
}
```

### ✅ CHECKPOINT 4
- [ ] Stripe client initializes without error
- [ ] PaymentIntent can be created (test with Stripe dashboard)

**Test (requires valid Stripe test key):**
```typescript
import { PaymentService } from '@/lib/services/payment';

// Test with a mock checkout
const mockCheckout = {
  checkout_id: 'chk_test',
  checkout_reference_id: 'ref_test',
  total: { amount: 1000, currency: 'usd' },
  line_items: [{ name: 'Test Product' }],
};

const result = await PaymentService.createPaymentIntent(mockCheckout, 'demo_token');
console.log('PaymentIntent created:', result);
```

---

## PHASE 5: API ENDPOINTS (1.5 hours)

### Step 5.1: Auth Middleware

Create `src/lib/middleware/auth.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// ACP AUTHENTICATION MIDDLEWARE
// =============================================================================

export function validateACPAuth(request: NextRequest): { valid: boolean; error?: string } {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header' };
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Invalid Authorization format. Expected: Bearer <token>' };
  }
  
  const token = authHeader.slice(7);
  const expectedToken = process.env.ACP_AUTH_TOKEN;
  
  if (!expectedToken) {
    console.warn('[Auth] ACP_AUTH_TOKEN not configured, allowing request');
    return { valid: true };
  }
  
  if (token !== expectedToken) {
    return { valid: false, error: 'Invalid authorization token' };
  }
  
  return { valid: true };
}

export function unauthorizedResponse(error: string): NextResponse {
  return NextResponse.json(
    { error: { code: 'unauthorized', message: error } },
    { status: 401 }
  );
}
```

### Step 5.2: Create Checkout Endpoint

Create `src/app/api/acp/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { CreateCheckoutRequestSchema } from '@/lib/schemas';
import { CheckoutService } from '@/lib/services/checkout';
import { validateACPAuth, unauthorizedResponse } from '@/lib/middleware/auth';

// =============================================================================
// POST /api/acp/checkout - Create Checkout
// =============================================================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] POST /api/acp/checkout`);
  
  try {
    // Validate authentication
    const auth = validateACPAuth(request);
    if (!auth.valid) {
      console.log(`[${requestId}] Auth failed: ${auth.error}`);
      return unauthorizedResponse(auth.error!);
    }
    
    // Parse and validate request body
    const body = await request.json();
    const parseResult = CreateCheckoutRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      console.log(`[${requestId}] Validation failed:`, parseResult.error.errors);
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Invalid request body',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }
    
    // Create checkout
    const checkout = CheckoutService.createCheckout(parseResult.data);
    console.log(`[${requestId}] Checkout created: ${checkout.checkout_id}`);
    
    return NextResponse.json(checkout, { status: 201 });
    
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    
    // Handle known errors
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('out of stock')) {
        return NextResponse.json(
          { error: { code: 'invalid_request', message: error.message } },
          { status: 400 }
        );
      }
    }
    
    // Unknown error
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
```

### Step 5.3: Update Checkout Endpoint

Create `src/app/api/acp/checkout/update/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { UpdateCheckoutRequestSchema } from '@/lib/schemas';
import { CheckoutService } from '@/lib/services/checkout';
import { validateACPAuth, unauthorizedResponse } from '@/lib/middleware/auth';

// =============================================================================
// POST /api/acp/checkout/update - Update Checkout
// =============================================================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] POST /api/acp/checkout/update`);
  
  try {
    // Validate authentication
    const auth = validateACPAuth(request);
    if (!auth.valid) {
      return unauthorizedResponse(auth.error!);
    }
    
    // Parse and validate request body
    const body = await request.json();
    const parseResult = UpdateCheckoutRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Invalid request body',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }
    
    // Update checkout
    const result = CheckoutService.updateCheckout(parseResult.data);
    console.log(`[${requestId}] Checkout updated: ${result.checkout_id} -> ${result.status}`);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: { code: 'not_found', message: error.message } },
          { status: 404 }
        );
      }
      if (error.message.includes('Invalid')) {
        return NextResponse.json(
          { error: { code: 'invalid_request', message: error.message } },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
```

### Step 5.4: Complete Checkout Endpoint

Create `src/app/api/acp/checkout/complete/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { CompleteCheckoutRequestSchema } from '@/lib/schemas';
import { CheckoutService } from '@/lib/services/checkout';
import { PaymentService } from '@/lib/services/payment';
import { validateACPAuth, unauthorizedResponse } from '@/lib/middleware/auth';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// POST /api/acp/checkout/complete - Complete Checkout with Payment
// =============================================================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] POST /api/acp/checkout/complete`);
  
  try {
    // Validate authentication
    const auth = validateACPAuth(request);
    if (!auth.valid) {
      return unauthorizedResponse(auth.error!);
    }
    
    // Parse and validate request body
    const body = await request.json();
    const parseResult = CompleteCheckoutRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'validation_error',
            message: 'Invalid request body',
            details: parseResult.error.errors,
          },
        },
        { status: 400 }
      );
    }
    
    const { checkout_id, payment_token } = parseResult.data;
    
    // Get checkout
    const checkout = CheckoutService.getCheckout(checkout_id);
    if (!checkout) {
      return NextResponse.json(
        { error: { code: 'not_found', message: 'Checkout not found' } },
        { status: 404 }
      );
    }
    
    // Validate checkout status
    if (checkout.status === 'completed') {
      return NextResponse.json(
        { error: { code: 'already_completed', message: 'Checkout already completed' } },
        { status: 400 }
      );
    }
    
    if (checkout.status === 'failed') {
      return NextResponse.json(
        { error: { code: 'checkout_failed', message: 'Checkout has failed and cannot be completed' } },
        { status: 400 }
      );
    }
    
    // Check if checkout is ready for payment
    if (checkout.required_fields.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'checkout_incomplete',
            message: 'Checkout is missing required fields',
            details: { required_fields: checkout.required_fields },
          },
        },
        { status: 400 }
      );
    }
    
    // Mark as processing
    CheckoutService.markProcessing(checkout_id, 'pending');
    
    try {
      // Create PaymentIntent
      const paymentResult = await PaymentService.createPaymentIntent(
        checkout,
        payment_token
      );
      
      // Update with PaymentIntent ID
      CheckoutService.markProcessing(checkout_id, paymentResult.paymentIntentId);
      
      // In demo mode, we mark as completed immediately
      // In production, you'd wait for webhook confirmation
      const orderId = `ord_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      CheckoutService.markCompleted(checkout_id, orderId);
      
      console.log(`[${requestId}] Checkout completed: ${checkout_id} -> Order: ${orderId}`);
      
      return NextResponse.json({
        checkout_id,
        status: 'completed',
        order_id: orderId,
        receipt_url: paymentResult.receiptUrl,
      });
      
    } catch (paymentError) {
      console.error(`[${requestId}] Payment failed:`, paymentError);
      
      const errorMessage = paymentError instanceof Error 
        ? paymentError.message 
        : 'Payment processing failed';
      
      CheckoutService.markFailed(checkout_id, errorMessage);
      
      return NextResponse.json({
        checkout_id,
        status: 'failed',
        failure_reason: errorMessage,
      });
    }
    
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    
    return NextResponse.json(
      { error: { code: 'internal_error', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
```

### Step 5.5: Health Check Endpoint

Create `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { CheckoutStore } from '@/lib/store/checkouts';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    store_stats: CheckoutStore.getStats(),
  });
}
```

### Step 5.6: ACP Discovery Endpoint

Create `public/.well-known/acp.json`:

```json
{
  "version": "1.0",
  "name": "ACP Merchant Demo",
  "description": "Demo merchant implementation of Agentic Commerce Protocol",
  "endpoints": {
    "checkout": "/api/acp/checkout",
    "checkout_update": "/api/acp/checkout/update",
    "checkout_complete": "/api/acp/checkout/complete",
    "webhooks": "/api/acp/webhooks"
  },
  "supported_currencies": ["usd"],
  "supported_countries": ["US"],
  "capabilities": {
    "shipping": true,
    "tax_calculation": false,
    "subscriptions": false
  }
}
```

### ✅ CHECKPOINT 5
- [ ] All endpoints return proper responses
- [ ] Auth validation works
- [ ] Error handling returns correct status codes
- [ ] Health check returns stats

**Smoke Test Script (save as `test-acp.sh`):**
```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
AUTH_TOKEN="demo_acp_token_12345"

echo "=== Testing ACP Endpoints ==="

# Test 1: Health check
echo -e "\n1. Health Check..."
curl -s $BASE_URL/api/health | jq

# Test 2: Create checkout
echo -e "\n2. Create Checkout..."
CHECKOUT_RESPONSE=$(curl -s -X POST $BASE_URL/api/acp/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "checkout_reference_id": "test_ref_001",
    "line_items": [
      { "product_id": "prod_running_shoe", "quantity": 1, "variant_id": "var_size_10" }
    ]
  }')
echo $CHECKOUT_RESPONSE | jq

CHECKOUT_ID=$(echo $CHECKOUT_RESPONSE | jq -r '.checkout_id')
echo "Checkout ID: $CHECKOUT_ID"

# Test 3: Update checkout
echo -e "\n3. Update Checkout..."
curl -s -X POST $BASE_URL/api/acp/checkout/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{
    \"checkout_id\": \"$CHECKOUT_ID\",
    \"shipping_option_id\": \"ship_standard\",
    \"buyer_email\": \"test@example.com\",
    \"shipping_address\": {
      \"line1\": \"123 Main St\",
      \"city\": \"San Francisco\",
      \"state\": \"CA\",
      \"postal_code\": \"94102\",
      \"country\": \"US\"
    }
  }" | jq

# Test 4: Complete checkout
echo -e "\n4. Complete Checkout..."
curl -s -X POST $BASE_URL/api/acp/checkout/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{
    \"checkout_id\": \"$CHECKOUT_ID\",
    \"payment_token\": \"demo_spt_token_12345\"
  }" | jq

echo -e "\n=== Tests Complete ==="
```

---

## PHASE 6: WEBHOOK HANDLING (30 minutes)

### Step 6.1: Webhook Endpoint

Create `src/app/api/acp/webhooks/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/services/stripe';
import { CheckoutService } from '@/lib/services/checkout';
import { CheckoutStore } from '@/lib/store/checkouts';

// =============================================================================
// POST /api/acp/webhooks - Handle Stripe Webhooks
// =============================================================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] POST /api/acp/webhooks`);
  
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.log(`[${requestId}] Missing Stripe signature`);
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }
    
    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error(`[${requestId}] Webhook signature verification failed:`, err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }
    
    console.log(`[${requestId}] Webhook event: ${event.type}`);
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const checkoutId = paymentIntent.metadata?.acp_checkout_id;
        
        if (checkoutId) {
          const orderId = `ord_${paymentIntent.id.slice(-16)}`;
          CheckoutService.markCompleted(checkoutId, orderId);
          console.log(`[${requestId}] Payment succeeded for checkout: ${checkoutId}`);
        }
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const checkoutId = paymentIntent.metadata?.acp_checkout_id;
        
        if (checkoutId) {
          const failureMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
          CheckoutService.markFailed(checkoutId, failureMessage);
          console.log(`[${requestId}] Payment failed for checkout: ${checkoutId}`);
        }
        break;
      }
      
      case 'charge.dispute.created': {
        const dispute = event.data.object;
        console.log(`[${requestId}] Dispute created: ${dispute.id}`);
        // In production: Flag order, gather evidence, notify team
        break;
      }
      
      default:
        console.log(`[${requestId}] Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error(`[${requestId}] Webhook error:`, error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
```

### ✅ CHECKPOINT 6
- [ ] Webhook endpoint accepts POST
- [ ] Stripe signature verification works
- [ ] Events update checkout status correctly

---

## PHASE 7: DOCUMENTATION & DEPLOYMENT (1 hour)

### Step 7.1: Create README

Create `README.md`:

```markdown
# ACP Merchant Demo

A reference implementation of the [Agentic Commerce Protocol](https://agenticcommerce.dev) (ACP), demonstrating how merchants can accept checkouts from AI agents like ChatGPT.

## What is ACP?

ACP is an open standard co-developed by Stripe and OpenAI that enables AI agents to initiate and complete purchases on behalf of users. This demo implements the merchant side of the protocol.

## Architecture

\`\`\`
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   User      │────▶│   AI Agent      │────▶│  This Server │
│   (Buyer)   │     │   (ChatGPT)     │     │  (Merchant)  │
└─────────────┘     └─────────────────┘     └──────────────┘
                           │                       │
                           │                       ▼
                           │                ┌──────────────┐
                           │                │   Stripe     │
                           └───────────────▶│   (Payment)  │
                                            └──────────────┘
\`\`\`

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/api/acp/checkout\` | POST | Create a new checkout |
| \`/api/acp/checkout/update\` | POST | Update checkout (shipping, address) |
| \`/api/acp/checkout/complete\` | POST | Complete with payment token |
| \`/api/acp/webhooks\` | POST | Handle Stripe webhooks |
| \`/api/health\` | GET | Health check |
| \`/.well-known/acp.json\` | GET | ACP discovery |

## Quick Start

\`\`\`bash
# Clone and install
git clone https://github.com/nickcarndt/acp-merchant-demo.git
cd acp-merchant-demo
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Stripe keys

# Run locally
npm run dev
\`\`\`

## Testing

\`\`\`bash
# Run smoke tests
./test-acp.sh
\`\`\`

## Related Projects

- [MCP Server](https://github.com/nickcarndt/mcp-partner-integration-demo) - AI agent tools for Stripe/Shopify

## Resources

- [ACP Specification](https://agenticcommerce.dev)
- [Stripe ACP Docs](https://docs.stripe.com/agentic-commerce/protocol)
- [OpenAI Commerce Docs](https://developers.openai.com/commerce)

## Author

Nicholas Arndt - [GitHub](https://github.com/nickcarndt)
\`\`\`

### Step 7.2: Deploy to Vercel

\`\`\`bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
# - ACP_AUTH_TOKEN
\`\`\`

### Step 7.3: Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/acp/webhooks`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.dispute.created`
4. Copy webhook secret to Vercel environment variables

### ✅ CHECKPOINT 7 (FINAL)
- [ ] All endpoints working locally
- [ ] Deployed to Vercel
- [ ] Webhooks configured in Stripe
- [ ] README complete
- [ ] Smoke tests pass on production URL

---

## BUILD TIMELINE

| Phase | Estimated Time | Target Completion |
|-------|---------------|-------------------|
| Phase 0: Setup | 30 min | Dec 29 PM |
| Phase 1: Types | 45 min | Dec 29 PM |
| Phase 2: Store | 45 min | Dec 29 PM |
| Phase 3: Checkout Service | 1 hour | Dec 30 AM |
| Phase 4: Payment Service | 45 min | Dec 30 AM |
| Phase 5: API Endpoints | 1.5 hours | Dec 30 PM |
| Phase 6: Webhooks | 30 min | Dec 30 PM |
| Phase 7: Deploy | 1 hour | Dec 30 PM |

**Total: ~7 hours**

**Buffer days:** Dec 31 - Jan 2 for testing, polish, and interview prep

---

## INTERVIEW PREP AFTER BUILD

Once deployed, practice:

1. **2-minute demo walkthrough** - Show the flow from create → update → complete
2. **Architecture explanation** - Draw the diagram, explain each component
3. **"Why did you build this?"** - Connect to Stripe's ACP announcement, show you're forward-thinking
4. **"What would you add?"** - Product feed, real SharedPaymentToken, database persistence

Good luck! 🚀
