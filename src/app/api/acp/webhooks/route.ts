import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/services/stripe';
import { CheckoutService } from '@/lib/services/checkout';

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

