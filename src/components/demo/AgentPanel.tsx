'use client';

import { DemoProduct, DEMO_PRODUCTS, SHIPPING_OPTIONS } from '@/lib/demo-products';
import { ProductCard } from './ProductCard';
import { CheckoutCard } from './CheckoutCard';
import { SuccessCard } from './SuccessCard';
import { DemoStep } from '@/hooks/useAcpDemo';
import { useState, useEffect } from 'react';

interface AgentPanelProps {
  step: DemoStep;
  selectedProduct: DemoProduct | null;
  checkoutData: any;
  orderData: any;
  isLoading: boolean;
  onProductSelect: (product: DemoProduct) => void;
  onShippingSelect: (shippingId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onPay: () => void;
}

export function AgentPanel({
  step,
  selectedProduct,
  checkoutData,
  orderData,
  isLoading,
  onProductSelect,
  onShippingSelect,
  onQuantityChange,
  onPay,
}: AgentPanelProps) {
  const [selectedShipping, setSelectedShipping] = useState('ship_standard');
  const [showProducts, setShowProducts] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Reset quantity when product changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedProduct]);

  const handleShippingChange = (shippingId: string) => {
    setSelectedShipping(shippingId);
    onShippingSelect(shippingId);
  };

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
    onQuantityChange(newQuantity);
  };

  const shippingOption = SHIPPING_OPTIONS.find(s => s.id === selectedShipping) || SHIPPING_OPTIONS[0];
  const total = selectedProduct ? (selectedProduct.price * quantity) + shippingOption.price : 0;

  return (
    <div className="bg-slate-100 rounded-2xl p-6 min-h-[600px]">
      {/* Label */}
      <div className="inline-block px-3 py-1 border-2 border-gray-400/60 rounded-sm font-mono text-xs text-gray-600 mb-6">
        Agent
      </div>

      {/* Chat Message */}
      <div className="flex justify-end mb-4">
        <div className="bg-indigo-700 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-[75%] shadow-sm">
          <p className="text-sm">Hey! I need a birthday gift for my friend.</p>
        </div>
      </div>

      {/* Try it out / Products */}
      {step === 'initial' && !showProducts && (
        <div className="text-center">
          <button
            onClick={() => setShowProducts(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium tracking-wide"
          >
            Try it out
          </button>
          <p className="text-gray-600 text-sm mt-2">Here are some options to check out:</p>
        </div>
      )}

      {/* Product Grid */}
      {(showProducts || step !== 'initial') && step !== 'checkout' && step !== 'complete' && (
        <div className="mt-4">
          <p className="text-gray-600 text-sm mb-4">Here are some options to check out:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DEMO_PRODUCTS.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onProductSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Checkout Card */}
      {step === 'checkout' && selectedProduct && (
        <div className="mt-4">
          <CheckoutCard
            product={selectedProduct}
            quantity={quantity}
            selectedShipping={selectedShipping}
            onQuantityChange={handleQuantityChange}
            onShippingChange={handleShippingChange}
            onPay={onPay}
            isLoading={isLoading}
            total={total}
          />
        </div>
      )}

      {/* Success Card */}
      {step === 'complete' && selectedProduct && (
        <div className="mt-4">
          <SuccessCard
            product={selectedProduct}
            orderId={checkoutData?.checkout_id || orderData?.order_id || 'ord_demo'}
            total={total}
            quantity={quantity}
          />
        </div>
      )}
    </div>
  );
}
