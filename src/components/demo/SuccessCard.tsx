'use client';

import { DemoProduct } from '@/lib/demo-products';

interface SuccessCardProps {
  product: DemoProduct;
  orderId: string;
  total: number;
}

export function SuccessCard({ product, orderId, total }: SuccessCardProps) {
  // Calculate estimated delivery (7 days from now)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7);
  const deliveryFormatted = deliveryDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-sm">
      {/* Success Header */}
      <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="font-semibold text-gray-900">Purchase complete</span>
      </div>

      {/* Product */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start gap-4">
          <img
            src={product.image}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-lg bg-gray-100"
          />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
            <p className="text-gray-500 text-sm">{product.variant}</p>
            <p className="text-gray-500 text-sm">Quantity: 1</p>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Estimated delivery</span>
          <span className="text-gray-900 font-medium">{deliveryFormatted}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Sold by</span>
          <span className="text-gray-900">{product.merchant}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Paid {product.merchant}</span>
          <span className="text-gray-900 font-semibold">${(total / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Checkout ID</span>
          <span className="text-gray-400 font-mono text-xs">{orderId}</span>
        </div>
      </div>

      {/* Confirmation Message */}
      <div className="px-4 pb-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          🎉 {product.merchant} confirmed your order! You'll get a confirmation email soon. 
          If you have questions, follow up with {product.merchant} directly.
        </p>
      </div>
    </div>
  );
}

