'use client';

import { DemoProduct, DEMO_PRODUCTS, SHIPPING_OPTIONS } from '@/lib/demo-products';
import { ProductCard } from './ProductCard';
import { CheckoutCard } from './CheckoutCard';
import { SuccessCard } from './SuccessCard';
import { DemoStep } from '@/hooks/useAcpDemo';
import { useState, useMemo } from 'react';

interface CheckoutData {
  checkout_id?: string;
  line_items?: Array<{ item?: { quantity?: number } }>;
  [key: string]: unknown;
}

interface OrderData {
  order_id?: string;
  [key: string]: unknown;
}

interface AgentPanelProps {
  step: DemoStep;
  selectedProduct: DemoProduct | null;
  checkoutData: CheckoutData | null;
  orderData: OrderData | null;
  isPaymentProcessing: boolean;
  onProductSelect: (product: DemoProduct) => void;
  onShippingSelect: (shippingId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onPay: () => void;
}

// Separate component to reset state when product changes via key prop
function CheckoutSection({
  selectedProduct,
  isPaymentProcessing,
  onShippingChange,
  onQuantityChange,
  onPay,
}: {
  selectedProduct: DemoProduct;
  isPaymentProcessing: boolean;
  onShippingChange: (shippingId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onPay: () => void;
}) {
  const [selectedShipping, setSelectedShipping] = useState('ship_standard');
  const [quantity, setQuantity] = useState(1);
  
  const handleShippingChange = (shippingId: string) => {
    setSelectedShipping(shippingId);
    onShippingChange(shippingId);
  };

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
    onQuantityChange(newQuantity);
  };

  const shippingOption = SHIPPING_OPTIONS.find(s => s.id === selectedShipping) || SHIPPING_OPTIONS[0];
  const total = (selectedProduct.price * quantity) + shippingOption.price;

  return (
    <CheckoutCard
      product={selectedProduct}
      quantity={quantity}
      selectedShipping={selectedShipping}
      onQuantityChange={handleQuantityChange}
      onShippingChange={handleShippingChange}
      onPay={onPay}
      isLoading={isPaymentProcessing}
      total={total}
    />
  );
}

export function AgentPanel({
  step,
  selectedProduct,
  checkoutData,
  orderData,
  isPaymentProcessing,
  onProductSelect,
  onShippingSelect,
  onQuantityChange,
  onPay,
}: AgentPanelProps) {
  const [showProducts, setShowProducts] = useState(false);
  
  // Get quantity and total from checkoutData for success card display
  const displayQuantity = useMemo(() => {
    if (checkoutData?.line_items && Array.isArray(checkoutData.line_items)) {
      return checkoutData.line_items[0]?.item?.quantity ?? 1;
    }
    return 1;
  }, [checkoutData]);
  
  const displayTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    const shippingOption = SHIPPING_OPTIONS[0];
    return (selectedProduct.price * displayQuantity) + shippingOption.price;
  }, [selectedProduct, displayQuantity]);

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

      {/* Checkout Card - key prop resets state when product changes */}
      {step === 'checkout' && selectedProduct && (
        <div className="mt-4">
          <CheckoutSection
            key={selectedProduct.id}
            selectedProduct={selectedProduct}
            isPaymentProcessing={isPaymentProcessing}
            onShippingChange={onShippingSelect}
            onQuantityChange={onQuantityChange}
            onPay={onPay}
          />
        </div>
      )}

      {/* Success Card */}
      {step === 'complete' && selectedProduct && (
        <div className="mt-4">
          <SuccessCard
            product={selectedProduct}
            orderId={checkoutData?.checkout_id ?? orderData?.order_id ?? 'ord_demo'}
            total={displayTotal}
            quantity={displayQuantity}
          />
        </div>
      )}
    </div>
  );
}
