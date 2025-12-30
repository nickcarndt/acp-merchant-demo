'use client';

import { AgentPanel } from './AgentPanel';
import { BusinessPanel } from './BusinessPanel';
import { FlowConnector } from './FlowConnector';
import { useAcpDemo } from '@/hooks/useAcpDemo';

export function DemoContainer() {
  const demo = useAcpDemo();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 items-start relative">
        {/* Agent Panel (Left) */}
        <div className="relative">
          <AgentPanel 
            step={demo.step}
            selectedProduct={demo.selectedProduct}
            checkoutData={demo.checkoutData}
            orderData={demo.orderData}
            isLoading={demo.isLoading}
            isPaymentProcessing={demo.isPaymentProcessing}
            onProductSelect={demo.selectProduct}
            onShippingSelect={demo.selectShipping}
            onQuantityChange={demo.updateQuantity}
            onPay={demo.completePurchase}
          />
        </div>

        {/* Animated Arrow Between Panels */}
        <FlowConnector direction={demo.arrowDirection} />

        {/* Business Panel (Right) */}
        <div className="relative">
          <BusinessPanel 
            checkoutState={demo.checkoutState}
            acpRequests={demo.acpRequests}
          />
        </div>
      </div>
    </div>
  );
}

