import type { Product, ShippingOption } from '@/lib/types';

// =============================================================================
// DEMO PRODUCT CATALOG
// In production, this would connect to Shopify, your database, etc.
// =============================================================================

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'prod_running_shoe',
    name: 'Performance Running Shoe',
    description: 'Lightweight running shoe with responsive cushioning for daily training.',
    price: { amount: 12999, currency: 'usd' },
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
    in_stock: true,
    variants: [
      { id: 'var_size_8', name: 'Size 8', in_stock: true },
      { id: 'var_size_9', name: 'Size 9', in_stock: true },
      { id: 'var_size_10', name: 'Size 10', in_stock: true },
      { id: 'var_size_11', name: 'Size 11', in_stock: false },
    ],
  },
  {
    id: 'prod_wireless_earbuds',
    name: 'Pro Wireless Earbuds',
    description: 'Active noise cancellation with 24-hour battery life.',
    price: { amount: 19999, currency: 'usd' },
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400'],
    in_stock: true,
    variants: [
      { id: 'var_color_black', name: 'Midnight Black', in_stock: true },
      { id: 'var_color_white', name: 'Pearl White', in_stock: true },
    ],
  },
  {
    id: 'prod_laptop_stand',
    name: 'Ergonomic Laptop Stand',
    description: 'Aluminum laptop stand with adjustable height for better posture.',
    price: { amount: 7999, currency: 'usd' },
    images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400'],
    in_stock: true,
  },
  {
    id: 'prod_water_bottle',
    name: 'Insulated Water Bottle',
    description: '32oz stainless steel bottle, keeps drinks cold for 24 hours.',
    price: { amount: 3499, currency: 'usd' },
    images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400'],
    in_stock: true,
    variants: [
      { id: 'var_color_blue', name: 'Ocean Blue', in_stock: true },
      { id: 'var_color_green', name: 'Forest Green', in_stock: true },
      { id: 'var_color_black', name: 'Matte Black', in_stock: true },
    ],
  },
];

export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: 'ship_standard',
    name: 'Standard Shipping',
    description: 'Delivered in 5-7 business days',
    price: { amount: 599, currency: 'usd' },
    estimated_days: { min: 5, max: 7 },
  },
  {
    id: 'ship_express',
    name: 'Express Shipping',
    description: 'Delivered in 2-3 business days',
    price: { amount: 1299, currency: 'usd' },
    estimated_days: { min: 2, max: 3 },
  },
  {
    id: 'ship_overnight',
    name: 'Overnight Shipping',
    description: 'Delivered next business day',
    price: { amount: 2499, currency: 'usd' },
    estimated_days: { min: 1, max: 1 },
  },
];

// =============================================================================
// PRODUCT SERVICE FUNCTIONS
// =============================================================================

export function getProductById(productId: string): Product | undefined {
  return DEMO_PRODUCTS.find(p => p.id === productId);
}

export function getProductVariant(product: Product, variantId: string) {
  return product.variants?.find(v => v.id === variantId);
}

export function getAllProducts(): Product[] {
  return DEMO_PRODUCTS;
}

export function getShippingOptions(): ShippingOption[] {
  return SHIPPING_OPTIONS;
}

export function getShippingOptionById(optionId: string): ShippingOption | undefined {
  return SHIPPING_OPTIONS.find(o => o.id === optionId);
}

