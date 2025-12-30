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
      console.log(`[${requestId}] Validation failed:`, parseResult.error.issues);
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

