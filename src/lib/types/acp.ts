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

