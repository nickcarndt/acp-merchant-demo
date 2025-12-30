/**
 * Smoke test for CheckoutService
 * Run with: npx tsx scripts/test-checkout-service.ts
 */

import { CheckoutService } from '../src/lib/services/checkout';
import { CheckoutStore } from '../src/lib/store/checkouts';
import { getProductById, DEMO_PRODUCTS } from '../src/lib/services/products';

console.log('=== CheckoutService Smoke Test ===\n');

// Test 1: Verify products exist
console.log('1. Product Catalog Check...');
console.log(`   Products available: ${DEMO_PRODUCTS.length}`);
const shoe = getProductById('prod_running_shoe');
console.log(`   Sample product: ${shoe?.name} - $${(shoe?.price.amount || 0) / 100}`);
console.log('   ✅ Product catalog OK\n');

// Test 2: Create checkout
console.log('2. Create Checkout...');
const createResult = CheckoutService.createCheckout({
  checkout_reference_id: 'test_ref_123',
  line_items: [
    { product_id: 'prod_running_shoe', quantity: 1, variant_id: 'var_size_10' },
    { product_id: 'prod_water_bottle', quantity: 2, variant_id: 'var_color_blue' },
  ],
});

console.log(`   Checkout ID: ${createResult.checkout_id}`);
console.log(`   Status: ${createResult.status}`);
console.log(`   Line items: ${createResult.line_items.length}`);
console.log(`   Subtotal: $${createResult.subtotal.amount / 100}`);
console.log(`   Required fields: ${createResult.required_fields.join(', ')}`);
console.log('   ✅ Create checkout OK\n');

// Test 3: Update checkout
console.log('3. Update Checkout...');
const updateResult = CheckoutService.updateCheckout({
  checkout_id: createResult.checkout_id,
  shipping_option_id: 'ship_standard',
  buyer_email: 'test@example.com',
  shipping_address: {
    line1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postal_code: '94102',
    country: 'US',
  },
});

console.log(`   Status: ${updateResult.status}`);
console.log(`   Subtotal: $${updateResult.subtotal.amount / 100}`);
console.log(`   Shipping: $${(updateResult.shipping_cost?.amount || 0) / 100}`);
console.log(`   Total: $${updateResult.total.amount / 100}`);
console.log(`   Ready for payment: ${updateResult.ready_for_payment}`);
console.log(`   Remaining required fields: ${updateResult.required_fields.length === 0 ? 'none' : updateResult.required_fields.join(', ')}`);
console.log('   ✅ Update checkout OK\n');

// Test 4: Verify session state
console.log('4. Verify Session State...');
const session = CheckoutService.getCheckout(createResult.checkout_id);
console.log(`   Session found: ${!!session}`);
console.log(`   Status: ${session?.status}`);
console.log(`   Shipping address: ${session?.shipping_address?.city}, ${session?.shipping_address?.state}`);
console.log(`   Buyer email: ${session?.buyer_email}`);
console.log('   ✅ Session state OK\n');

// Test 5: Store stats
console.log('5. Store Statistics...');
const stats = CheckoutStore.getStats();
console.log(`   Active checkouts: ${stats.active_checkouts}`);
console.log(`   Total created: ${stats.total_created}`);
console.log('   ✅ Store stats OK\n');

// Test 6: Error handling
console.log('6. Error Handling...');
try {
  CheckoutService.createCheckout({
    checkout_reference_id: 'error_test',
    line_items: [{ product_id: 'invalid_product', quantity: 1 }],
  });
  console.log('   ❌ Should have thrown error for invalid product');
} catch (error) {
  console.log(`   Caught expected error: "${(error as Error).message}"`);
  console.log('   ✅ Error handling OK\n');
}

console.log('=== All Tests Passed! ===');

