'use client';

import { useState, useCallback } from 'react';
import { DemoProduct, SHIPPING_OPTIONS } from '@/lib/demo-products';

export type DemoStep = 'initial' | 'products' | 'checkout' | 'complete';

interface AcpRequest {
  id: string;
  method: string;
  endpoint: string;
  request: any;
  response: any;
  timestamp: Date;
}

const ACP_AUTH_TOKEN = process.env.NEXT_PUBLIC_ACP_AUTH_TOKEN || 'demo_acp_token_12345';

export function useAcpDemo() {
  const [step, setStep] = useState<DemoStep>('products');
  const [selectedProduct, setSelectedProduct] = useState<DemoProduct | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [checkoutState, setCheckoutState] = useState<any>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [acpRequests, setAcpRequests] = useState<AcpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [currentShipping, setCurrentShipping] = useState('ship_standard');
  const [arrowDirection, setArrowDirection] = useState<'none' | 'request' | 'response'>('none');

  const addAcpRequest = (method: string, endpoint: string, request: any, response: any) => {
    const newRequest: AcpRequest = {
      id: `req_${Date.now()}`,
      method,
      endpoint,
      request,
      response,
      timestamp: new Date(),
    };
    setAcpRequests(prev => [...prev, newRequest]);
  };

  // Transform API response to ACP-style format for display
  const transformToAcpFormat = (apiResponse: any, product: DemoProduct, shippingId: string = 'ship_standard', quantity: number = 1) => {
    const shipping = SHIPPING_OPTIONS.find(s => s.id === shippingId) || SHIPPING_OPTIONS[0];
    const itemTotal = product.price * quantity;
    
    return {
      id: apiResponse.checkout_id || `checkout_${Date.now().toString(36)}`,
      status: apiResponse.status || 'ready_for_payment',
      currency: 'usd',
      line_items: [
        {
          id: `li_${product.id}`,
          item: {
            id: product.id,
            quantity: quantity,
          },
          base_amount: product.price,
          discount: 0,
          subtotal: itemTotal,
          tax: 0,
          total: itemTotal,
        },
      ],
      payment_provider: {
        provider: 'stripe',
        supported_payment_methods: ['card'],
      },
      fulfillment_options: SHIPPING_OPTIONS.map(opt => ({
        type: 'shipping',
        id: opt.id.replace('ship_', ''),
        title: opt.name,
        subtitle: opt.days,
        subtotal: opt.price,
        tax: 0,
        total: opt.price,
      })),
      fulfillment_option_id: shippingId.replace('ship_', ''),
      totals: [
        { type: 'items_base_amount', display_text: 'Items', amount: itemTotal },
        { type: 'fulfillment', display_text: 'Shipping', amount: shipping.price },
        { type: 'total', display_text: 'Total', amount: itemTotal + shipping.price },
      ],
    };
  };

  const selectProduct = useCallback(async (product: DemoProduct) => {
    setIsLoading(true);
    setSelectedProduct(product);
    setCurrentQuantity(1);
    setCurrentShipping('ship_standard');
    setArrowDirection('request');
    
    const requestStartTime = Date.now();
    
    const createRequestBody = {
      checkout_reference_id: `demo_${Date.now()}`,
      line_items: [{
        product_id: product.id,
        quantity: 1,
      }],
    };

    try {
      // Step 1: Create checkout
      const createResponse = await fetch('/api/acp/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACP_AUTH_TOKEN}`,
        },
        body: JSON.stringify(createRequestBody),
      });

      const createData = await createResponse.json();
      
      // Add to request log
      addAcpRequest('POST', '/checkouts', { items: [{ id: product.id, quantity: 1 }] }, createData);
      
      const checkoutId = createData.checkout_id;
      setCheckoutId(checkoutId);
      
      // Step 2: Immediately update with shipping info to make checkout ready for payment
      const updateRequestBody = {
        checkout_id: checkoutId,
        shipping_option_id: 'ship_standard',
        buyer_email: 'demo@example.com',
        shipping_address: {
          line1: '123 Demo Street',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94102',
          country: 'US',
        },
      };

      const updateResponse = await fetch('/api/acp/checkout/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACP_AUTH_TOKEN}`,
        },
        body: JSON.stringify(updateRequestBody),
      });

      const updateData = await updateResponse.json();
      
      // Add to request log
      addAcpRequest('POST', '/checkouts/update', { 
        checkout_id: checkoutId, 
        shipping_option_id: 'ship_standard',
        buyer_email: 'demo@example.com',
        shipping_address: { city: 'San Francisco', state: 'CA' }
      }, updateData);
      
      setCheckoutData(updateData);
      
      // Transform for display
      const acpFormat = transformToAcpFormat(updateData, product, 'ship_standard', 1);
      setCheckoutState(acpFormat);
      
      // Ensure request animation completes before starting response animation
      const elapsed = Date.now() - requestStartTime;
      const minRequestAnimationTime = 450;
      const delay = Math.max(0, minRequestAnimationTime - elapsed);
      
      setTimeout(() => {
        setArrowDirection('response');
        setTimeout(() => setArrowDirection('none'), 500);
      }, delay);
      
      setStep('checkout');
    } catch (error) {
      console.error('Error creating checkout:', error);
      setArrowDirection('none');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateQuantity = useCallback((quantity: number) => {
    if (!selectedProduct || !checkoutData) return;
    
    setCurrentQuantity(quantity);
    
    // Update the display format with new quantity
    const acpFormat = transformToAcpFormat(checkoutData, selectedProduct, currentShipping, quantity);
    setCheckoutState(acpFormat);
  }, [selectedProduct, checkoutData, currentShipping]);

  const selectShipping = useCallback(async (shippingId: string) => {
    if (!checkoutId || !selectedProduct) return;
    
    setCurrentShipping(shippingId);
    setIsLoading(true);
    setArrowDirection('request');
    
    const requestStartTime = Date.now();

    const requestBody = {
      checkout_id: checkoutId,
      shipping_option_id: shippingId,
      buyer_email: 'demo@example.com',
      shipping_address: {
        line1: '123 Demo Street',
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94102',
        country: 'US',
      },
    };

    try {
      const response = await fetch('/api/acp/checkout/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACP_AUTH_TOKEN}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      // Add to request log
      addAcpRequest('POST', '/checkouts/update', { checkout_id: checkoutId, shipping_option_id: shippingId }, data);
      
      setCheckoutData(data);
      
      // Update display format with current quantity
      const acpFormat = transformToAcpFormat(data, selectedProduct, shippingId, currentQuantity);
      setCheckoutState(acpFormat);
      
      // Ensure request animation completes before starting response animation
      const elapsed = Date.now() - requestStartTime;
      const minRequestAnimationTime = 450; // Slightly longer than 400ms animation
      const delay = Math.max(0, minRequestAnimationTime - elapsed);
      
      setTimeout(() => {
        setArrowDirection('response');
        setTimeout(() => setArrowDirection('none'), 500);
      }, delay);
    } catch (error) {
      console.error('Error updating checkout:', error);
      setArrowDirection('none');
    } finally {
      setIsLoading(false);
    }
  }, [checkoutId, selectedProduct, currentQuantity]);

  const completePurchase = useCallback(async () => {
    if (!checkoutId || !selectedProduct) return;
    
    setIsLoading(true);
    setArrowDirection('request');
    
    const requestStartTime = Date.now();

    const requestBody = {
      checkout_id: checkoutId,
      payment_token: 'demo_spt_4242',
    };

    try {
      const response = await fetch('/api/acp/checkout/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACP_AUTH_TOKEN}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      // Add to request log
      addAcpRequest('POST', '/checkouts/complete', { checkout_id: checkoutId, payment_token: 'spt_****4242' }, data);
      
      setOrderData(data);
      
      // Update display format to show completed
      const acpFormat = {
        ...checkoutState,
        status: 'completed',
        order_id: data.order_id,
      };
      setCheckoutState(acpFormat);
      
      // Ensure request animation completes before starting response animation
      const elapsed = Date.now() - requestStartTime;
      const minRequestAnimationTime = 450;
      const delay = Math.max(0, minRequestAnimationTime - elapsed);
      
      setTimeout(() => {
        setArrowDirection('response');
        setTimeout(() => setArrowDirection('none'), 500);
      }, delay);
      
      setStep('complete');
    } catch (error) {
      console.error('Error completing checkout:', error);
      setArrowDirection('none');
    } finally {
      setIsLoading(false);
    }
  }, [checkoutId, selectedProduct, checkoutState]);

  const reset = useCallback(() => {
    setStep('products');
    setSelectedProduct(null);
    setCheckoutId(null);
    setCheckoutData(null);
    setCheckoutState(null);
    setOrderData(null);
    setAcpRequests([]);
    setCurrentQuantity(1);
    setCurrentShipping('ship_standard');
    setArrowDirection('none');
  }, []);

  return {
    step,
    selectedProduct,
    checkoutData,
    checkoutState,
    orderData,
    acpRequests,
    isLoading,
    arrowDirection,
    selectProduct,
    selectShipping,
    updateQuantity,
    completePurchase,
    reset,
  };
}
