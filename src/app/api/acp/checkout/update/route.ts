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
            details: parseResult.error.issues,
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

