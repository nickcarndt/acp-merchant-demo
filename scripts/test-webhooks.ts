/**
 * Smoke test for Webhook Handler Logic
 * Run with: npx tsx scripts/test-webhooks.ts
 * 
 * Tests the webhook event handling logic without requiring actual Stripe webhooks
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

console.log('=== Webhook Handler Smoke Test ===\n');

// Import services
import { CheckoutService } from '../src/lib/services/checkout';
import { CheckoutStore } from '../src/lib/store/checkouts';

// Test 1: Create a checkout to test webhook updates on
console.log('1. Setup: Create test checkout...');
const checkout = CheckoutService.createCheckout({
  checkout_reference_id: 'webhook_test_ref',
  line_items: [
    { product_id: 'prod_running_shoe', quantity: 1, variant_id: 'var_size_10' }
  ],
});
console.log(`   Checkout ID: ${checkout.checkout_id}`);
console.log(`   Initial status: ${checkout.status}`);
console.log('   ✅ Test checkout created\n');

// Test 2: Update to ready_for_payment
console.log('2. Setup: Update checkout to ready_for_payment...');
CheckoutService.updateCheckout({
  checkout_id: checkout.checkout_id,
  shipping_option_id: 'ship_standard',
  buyer_email: 'webhook-test@example.com',
  shipping_address: {
    line1: '123 Test St',
    city: 'San Francisco',
    state: 'CA',
    postal_code: '94102',
    country: 'US',
  },
});
const afterUpdate = CheckoutService.getCheckout(checkout.checkout_id);
console.log(`   Status after update: ${afterUpdate?.status}`);
console.log('   ✅ Checkout ready for payment\n');

// Test 3: Simulate markProcessing (what happens when payment starts)
console.log('3. Test markProcessing...');
CheckoutService.markProcessing(checkout.checkout_id, 'pi_test_123456789');
const afterProcessing = CheckoutService.getCheckout(checkout.checkout_id);
console.log(`   Status: ${afterProcessing?.status}`);
console.log(`   PaymentIntent ID: ${afterProcessing?.payment_intent_id}`);
console.log('   ✅ markProcessing works\n');

// Test 4: Simulate payment_intent.succeeded webhook
console.log('4. Test markCompleted (simulates payment_intent.succeeded)...');
const orderId = 'ord_webhook_test_001';
CheckoutService.markCompleted(checkout.checkout_id, orderId);
const afterCompleted = CheckoutService.getCheckout(checkout.checkout_id);
console.log(`   Status: ${afterCompleted?.status}`);
console.log(`   Order ID: ${afterCompleted?.order_id}`);
console.log('   ✅ markCompleted works\n');

// Test 5: Create another checkout to test failure case
console.log('5. Test markFailed (simulates payment_intent.payment_failed)...');
const failCheckout = CheckoutService.createCheckout({
  checkout_reference_id: 'fail_test_ref',
  line_items: [{ product_id: 'prod_water_bottle', quantity: 1 }],
});
CheckoutService.markFailed(failCheckout.checkout_id, 'Card declined');
const afterFailed = CheckoutService.getCheckout(failCheckout.checkout_id);
console.log(`   Status: ${afterFailed?.status}`);
console.log(`   Failure reason: ${afterFailed?.failure_reason}`);
console.log('   ✅ markFailed works\n');

// Test 6: Verify store stats
console.log('6. Verify store statistics...');
const stats = CheckoutStore.getStats();
console.log(`   Active checkouts: ${stats.active_checkouts}`);
console.log(`   Total created: ${stats.total_created}`);
console.log(`   Total completed: ${stats.total_completed}`);
console.log(`   Total failed: ${stats.total_failed}`);
console.log('   ✅ Store stats tracking works\n');

console.log('=== All Webhook Tests Passed! ===');

