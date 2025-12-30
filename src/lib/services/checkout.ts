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
  static async createCheckout(request: CreateCheckoutRequest): Promise<CreateCheckoutResponse> {
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
    await CheckoutStore.create(session);
    
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
  static async updateCheckout(request: UpdateCheckoutRequest): Promise<UpdateCheckoutResponse> {
    const session = await CheckoutStore.get(request.checkout_id);
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
    const updatedSession = await CheckoutStore.update(request.checkout_id, updates);
    if (!updatedSession) {
      throw new Error('Failed to update checkout');
    }
    
    // Recalculate total
    const total = this.calculateTotal(updatedSession);
    await CheckoutStore.update(request.checkout_id, { total });
    
    // Determine remaining required fields
    const remainingRequired = this.getRemainingRequiredFields(updatedSession);
    await CheckoutStore.update(request.checkout_id, { 
      required_fields: remainingRequired,
      status: remainingRequired.length === 0 ? 'ready_for_payment' : 'pending',
    });
    
    // Get final session state
    const finalSession = await CheckoutStore.get(request.checkout_id);
    if (!finalSession) {
      throw new Error('Failed to get updated checkout');
    }
    
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
  static async getCheckout(checkoutId: string): Promise<CheckoutSession | undefined> {
    return await CheckoutStore.get(checkoutId);
  }

  /**
   * Mark checkout as processing (payment in progress)
   */
  static async markProcessing(checkoutId: string, paymentIntentId: string): Promise<void> {
    await CheckoutStore.update(checkoutId, {
      status: 'processing',
      payment_intent_id: paymentIntentId,
    });
  }

  /**
   * Mark checkout as completed
   */
  static async markCompleted(checkoutId: string, orderId: string): Promise<void> {
    await CheckoutStore.update(checkoutId, {
      status: 'completed',
      order_id: orderId,
    });
  }

  /**
   * Mark checkout as failed
   */
  static async markFailed(checkoutId: string, reason: string): Promise<void> {
    await CheckoutStore.update(checkoutId, {
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
