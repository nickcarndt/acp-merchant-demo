/**
 * Smoke test for PaymentService
 * Run with: npx tsx scripts/test-payment-service.ts
 * 
 * Note: Requires valid STRIPE_SECRET_KEY in .env.local
 */

// MUST load environment variables FIRST, before any other imports
import { config } from 'dotenv';
config({ path: '.env.local' });

console.log('=== PaymentService Smoke Test ===\n');

// Test 1: Check Stripe key is configured
console.log('1. Environment Check...');
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.log('   ❌ STRIPE_SECRET_KEY not set in .env.local');
  console.log('   Add your Stripe test key to continue\n');
  process.exit(1);
}

const isTestKey = stripeKey.startsWith('sk_test_');
const isPlaceholder = stripeKey.includes('YOUR_KEY') || stripeKey === 'sk_test_...';
console.log(`   Key type: ${isTestKey ? 'Test' : 'Live'} mode`);
console.log(`   Key configured: ${!isPlaceholder ? '✅ Real key' : '⚠️ Placeholder'}`);

if (isPlaceholder) {
  console.log('\n   ⚠️ Placeholder key detected. Skipping API tests.');
  console.log('   Replace with your real Stripe test key to test PaymentIntent creation.\n');
  console.log('=== Partial Test Complete (no API calls) ===');
  process.exit(0);
}

console.log('   ✅ Environment OK\n');

// Now import Stripe-dependent modules (after env is loaded)
async function runTests() {
  // Test 2: Import and initialize Stripe
  console.log('2. Stripe Client Initialization...');
  const { stripe } = await import('../src/lib/services/stripe');
  console.log(`   Stripe client loaded: ${!!stripe}`);
  console.log('   ✅ Stripe client OK\n');

  // Test 3: Import PaymentService
  console.log('3. PaymentService Import...');
  const { PaymentService } = await import('../src/lib/services/payment');
  console.log(`   PaymentService loaded: ${!!PaymentService}`);
  console.log(`   Methods: createPaymentIntent, getPaymentIntentStatus, cancelPaymentIntent`);
  console.log('   ✅ PaymentService OK\n');

  // Test 4: Create a test PaymentIntent
  console.log('4. Create Test PaymentIntent...');
  const mockCheckout = {
    checkout_id: 'chk_test_smoke',
    checkout_reference_id: 'ref_smoke_test',
    status: 'ready_for_payment' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    line_items: [{
      product_id: 'test_prod',
      quantity: 1,
      name: 'Smoke Test Product',
      unit_price: { amount: 1000, currency: 'usd' },
      total_price: { amount: 1000, currency: 'usd' },
    }],
    subtotal: { amount: 1000, currency: 'usd' },
    total: { amount: 1000, currency: 'usd' },
    available_shipping_options: [],
    required_fields: [],
  };

  try {
    const result = await PaymentService.createPaymentIntent(
      mockCheckout,
      'demo_token_smoke_test'
    );
    
    console.log(`   PaymentIntent ID: ${result.paymentIntentId}`);
    console.log(`   Status: ${result.status}`);
    console.log('   ✅ PaymentIntent created\n');
    
    // Test 5: Retrieve the PaymentIntent
    console.log('5. Retrieve PaymentIntent...');
    const retrieved = await PaymentService.getPaymentIntentStatus(result.paymentIntentId);
    console.log(`   Retrieved ID: ${retrieved.id}`);
    console.log(`   Amount: $${retrieved.amount / 100} ${retrieved.currency.toUpperCase()}`);
    console.log('   ✅ Retrieve OK\n');
    
    // Test 6: Cancel the PaymentIntent (cleanup)
    console.log('6. Cancel PaymentIntent (cleanup)...');
    await PaymentService.cancelPaymentIntent(result.paymentIntentId);
    console.log('   ✅ Cancelled\n');
    
    console.log('=== All Tests Passed! ===');
    
  } catch (error) {
    console.error(`   ❌ Error: ${(error as Error).message}\n`);
    console.log('=== Test Failed ===');
    process.exit(1);
  }
}

runTests();
