'use client';

import { AgentPanel } from './AgentPanel';
import { BusinessPanel } from './BusinessPanel';
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
            onProductSelect={demo.selectProduct}
            onShippingSelect={demo.selectShipping}
            onQuantityChange={demo.updateQuantity}
            onPay={demo.completePurchase}
          />
        </div>

        {/* Arrow Between Panels (Desktop only) */}
        <div className="hidden lg:flex absolute left-1/2 top-1/3 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex items-center text-white/60">
            <div className="w-8 border-t-2 border-dashed border-white/40"></div>
            <div className="w-3 h-3 border-t-2 border-r-2 border-white/40 transform rotate-45 -ml-1"></div>
          </div>
        </div>

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

