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

      // For demo: Create and confirm a PaymentIntent with a test card
      // Using off_session: true for server-side charge without customer present
      const paymentIntent = await stripe.paymentIntents.create({
        amount: checkout.total.amount,
        currency: checkout.total.currency,
        payment_method: 'pm_card_visa', // Stripe's test Visa card (4242424242424242)
        confirm: true, // Immediately confirm the payment
        off_session: true, // Server-side charge, customer not present
        payment_method_types: ['card'], // Explicitly set payment method type
        metadata: {
          acp_checkout_id: checkout.checkout_id,
          acp_checkout_reference: checkout.checkout_reference_id,
          demo_mode: 'true',
        },
        description: `ACP Demo Order - ${checkout.line_items.map(i => i.name).join(', ')}`,
        // Demo shipping details for the charge
        shipping: {
          name: 'Demo Customer',
          address: {
            line1: '123 Demo Street',
            city: 'San Francisco',
            state: 'CA',
            postal_code: '94102',
            country: 'US',
          },
        },
      });

      console.log(`[PaymentService] PaymentIntent created and confirmed: ${paymentIntent.id}, status: ${paymentIntent.status}`);

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

