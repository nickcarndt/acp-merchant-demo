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
            details: parseResult.error.issues,
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

