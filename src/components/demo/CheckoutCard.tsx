'use client';

import { DemoProduct, SHIPPING_OPTIONS } from '@/lib/demo-products';

interface CheckoutCardProps {
  product: DemoProduct;
  quantity: number;
  selectedShipping: string;
  onQuantityChange: (quantity: number) => void;
  onShippingChange: (shippingId: string) => void;
  onPay: () => void;
  isLoading: boolean;
  total: number;
}

export function CheckoutCard({
  product,
  quantity,
  selectedShipping,
  onQuantityChange,
  onShippingChange,
  onPay,
  isLoading,
}: CheckoutCardProps) {
  const shipping = SHIPPING_OPTIONS.find(s => s.id === selectedShipping) || SHIPPING_OPTIONS[0];
  const subtotal = product.price * quantity;
  const calculatedTotal = subtotal + shipping.price;

  const handleDecrement = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < 10) {
      onQuantityChange(quantity + 1);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="font-semibold text-gray-900">{product.merchant}</span>
      </div>

      {/* Product */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <img
            src={product.image}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-lg bg-gray-100"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
            <p className="text-gray-500 text-sm">{product.variant}</p>
            <p className="text-gray-900 font-medium text-sm mt-1">{product.priceFormatted}</p>
          </div>
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1 bg-gray-50">
            <button 
              onClick={handleDecrement}
              disabled={quantity <= 1}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded w-6 h-6 flex items-center justify-center font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            >
              −
            </button>
            <span className="text-sm font-semibold text-gray-900 w-6 text-center">{quantity}</span>
            <button 
              onClick={handleIncrement}
              disabled={quantity >= 10}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded w-6 h-6 flex items-center justify-center font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Shipping */}
      <div className="p-4 border-b border-gray-100">
        <label className="text-sm font-medium text-gray-700 block mb-2">Shipping</label>
        <select
          value={selectedShipping}
          onChange={(e) => onShippingChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
        >
          {SHIPPING_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} {option.days} {option.priceFormatted}
            </option>
          ))}
        </select>
      </div>

      {/* Totals */}
      <div className="p-4 border-b border-gray-100 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total due today</span>
          <span className="font-semibold text-gray-900">
            ${(calculatedTotal / 100).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Subtotal ({quantity} item{quantity > 1 ? 's' : ''})</span>
          <span className="text-gray-600">${(subtotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Shipping</span>
          <span className="text-gray-600">{shipping.priceFormatted}</span>
        </div>
      </div>

      {/* Pay Button */}
      <div className="p-4">
        <button
          onClick={onPay}
          disabled={isLoading}
          className="w-full bg-black text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-3 hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <span>Processing...</span>
          ) : (
            <>
              <span>Pay {product.merchant}</span>
              <span className="text-gray-400">|</span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth={2} />
                  <path d="M2 10h20" strokeWidth={2} />
                </svg>
                4242
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
