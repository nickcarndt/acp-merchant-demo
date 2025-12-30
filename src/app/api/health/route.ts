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

