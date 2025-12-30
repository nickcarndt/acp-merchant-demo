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

