'use client';

import { DemoProduct } from '@/lib/demo-products';

interface ProductCardProps {
  product: DemoProduct;
  onSelect: (product: DemoProduct) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <button
      onClick={() => onSelect(product)}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden text-left w-full group transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {/* Product Image */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
      </div>
      
      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
          {product.name}
        </h3>
        <p className="text-gray-500 text-sm mt-1">
          {product.variant}
        </p>
        <p className="text-gray-900 font-semibold mt-2">
          {product.priceFormatted}
        </p>
        <p className="text-gray-400 text-xs mt-1">
          {product.merchant}
        </p>
      </div>
    </button>
  );
}

