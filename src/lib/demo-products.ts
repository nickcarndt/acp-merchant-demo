export interface DemoProduct {
  id: string;
  name: string;
  variant: string;
  price: number;
  priceFormatted: string;
  image: string;
  merchant: string;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: 'prod_running_shoe',
    name: 'Performance Running Shoe',
    variant: 'Black - Size 10',
    price: 12999, // cents
    priceFormatted: '$129.99',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
    merchant: 'SportGear',
  },
  {
    id: 'prod_wireless_earbuds',
    name: 'Pro Wireless Earbuds',
    variant: 'Midnight Black',
    price: 19999,
    priceFormatted: '$199.99',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop',
    merchant: 'TechShop',
  },
  {
    id: 'prod_ergonomic_mouse',
    name: 'Ergonomic Mouse',
    variant: 'Silver',
    price: 7999,
    priceFormatted: '$79.99',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop',
    merchant: 'DeskWorks',
  },
];

export const SHIPPING_OPTIONS = [
  { id: 'ship_standard', name: 'Standard', days: '5-7 business days', price: 599, priceFormatted: '$5.99' },
  { id: 'ship_express', name: 'Express', days: '2-3 business days', price: 1299, priceFormatted: '$12.99' },
  { id: 'ship_overnight', name: 'Overnight', days: 'Next business day', price: 2499, priceFormatted: '$24.99' },
];

