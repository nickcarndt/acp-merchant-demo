# ACP MERCHANT DEMO — ARCHITECTURE BLUEPRINT
## Agentic Commerce Protocol Implementation Guide
### Author: Nicholas Arndt | Target: Stripe SA Interview (Jan 7, 2025)

---

## EXECUTIVE SUMMARY

This document defines the architecture for an Agentic Commerce Protocol (ACP) merchant demo that complements your existing MCP server. Together, these projects demonstrate complete understanding of agentic commerce — both the AI agent tooling (MCP) and the merchant integration (ACP).

**What You're Building:**
A minimal but complete ACP-compliant merchant server that can receive checkout requests from AI agents like ChatGPT's Instant Checkout.

**Why It Matters:**
- ACP was co-developed by Stripe and OpenAI (September 2025)
- It's Stripe's strategic bet on AI commerce infrastructure
- Building this shows you understand where platform payments is heading
- The interviewer will recognize you're ahead of the curve

---

## SYSTEM ARCHITECTURE

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AGENTIC COMMERCE FLOW                           │
│                                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────────────┐   │
│  │  Human   │───▶│  AI Agent    │───▶│  YOUR ACP MERCHANT      │   │
│  │  (Buyer) │    │  (ChatGPT)   │    │  DEMO SERVER            │   │
│  └──────────┘    └──────────────┘    └─────────────────────────┘   │
│                         │                       │                   │
│                         │                       │                   │
│                         ▼                       ▼                   │
│                  ┌──────────────┐    ┌─────────────────────────┐   │
│                  │  Your MCP    │    │  Stripe API             │   │
│                  │  Server      │    │  (Payment Processing)   │   │
│                  │  (existing)  │    │                         │   │
│                  └──────────────┘    └─────────────────────────┘   │
│                                                                     │
│  ────────────────────────────────────────────────────────────────  │
│                                                                     │
│  MCP SERVER = Tools AI uses to interact with services              │
│  ACP SERVER = Checkout interface merchant exposes to AI agents     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### ACP Endpoint Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ACP MERCHANT SERVER                             │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  API LAYER (Express.js / Next.js API Routes)                   ││
│  │                                                                 ││
│  │  POST /acp/checkout          → CreateCheckoutHandler           ││
│  │  POST /acp/checkout/update   → UpdateCheckoutHandler           ││
│  │  POST /acp/checkout/complete → CompleteCheckoutHandler         ││
│  │  POST /acp/webhooks          → WebhookHandler                  ││
│  │  GET  /acp/health            → HealthCheck                     ││
│  │  GET  /.well-known/acp.json  → ACP Discovery                   ││
│  └────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  SERVICE LAYER                                                  ││
│  │                                                                 ││
│  │  CheckoutService         → Manages checkout state              ││
│  │  ProductService          → Product catalog / inventory         ││
│  │  PaymentService          → Stripe integration                  ││
│  │  WebhookService          → Order event handling                ││
│  └────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  DATA LAYER                                                     ││
│  │                                                                 ││
│  │  In-Memory Store (MVP)   → Checkout sessions, orders           ││
│  │  Product Catalog         → Static JSON or Shopify API          ││
│  └────────────────────────────────────────────────────────────────┘│
│                              │                                      │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  EXTERNAL INTEGRATIONS                                          ││
│  │                                                                 ││
│  │  Stripe API              → PaymentIntents, SharedPaymentTokens ││
│  │  Shopify API (optional)  → Real product data                   ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ACP PROTOCOL SPECIFICATION

### Core Concepts

**1. Checkout State Machine**
```
CREATED → PENDING → READY_FOR_PAYMENT → PROCESSING → COMPLETED
                                              ↓
                                           FAILED
```

**2. Required Endpoints (per ACP spec)**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/acp/checkout` | POST | Create new checkout session |
| `/acp/checkout` | POST | Update checkout (same endpoint, idempotent) |
| `/acp/checkout/complete` | POST | Complete with payment token |
| `/acp/webhooks` | POST | Receive async order events |
| `/.well-known/acp.json` | GET | Discovery endpoint |

**3. Authentication**
- Bearer token in Authorization header
- HMAC signature on webhook payloads
- HTTPS required for all endpoints

---

## DATA MODELS

### CreateCheckoutRequest
```typescript
interface CreateCheckoutRequest {
  // Required
  checkout_reference_id: string;  // Agent's reference
  line_items: LineItem[];
  
  // Optional
  buyer_context?: {
    locale?: string;
    currency?: string;
    shipping_country?: string;
  };
  metadata?: Record<string, string>;
}

interface LineItem {
  product_id: string;
  quantity: number;
  variant_id?: string;
}
```

### CreateCheckoutResponse
```typescript
interface CreateCheckoutResponse {
  // Required
  checkout_id: string;            // Your reference
  checkout_reference_id: string;  // Echo back agent's reference
  status: CheckoutStatus;
  
  // Pricing
  subtotal: Money;
  total: Money;
  tax?: Money;
  shipping_cost?: Money;
  
  // Options
  shipping_options?: ShippingOption[];
  payment_methods?: PaymentMethod[];
  
  // What's needed to proceed
  required_fields?: RequiredField[];
  
  // Line items with resolved details
  line_items: ResolvedLineItem[];
}

interface Money {
  amount: number;      // In smallest unit (cents)
  currency: string;    // ISO 4217 (usd, eur, etc.)
}

type CheckoutStatus = 
  | 'created'
  | 'pending' 
  | 'ready_for_payment'
  | 'processing'
  | 'completed'
  | 'failed';
```

### UpdateCheckoutRequest
```typescript
interface UpdateCheckoutRequest {
  checkout_id: string;
  
  // Optional updates
  shipping_option_id?: string;
  shipping_address?: Address;
  billing_address?: Address;
  buyer_email?: string;
  buyer_phone?: string;
  metadata?: Record<string, string>;
}
```

### CompleteCheckoutRequest
```typescript
interface CompleteCheckoutRequest {
  checkout_id: string;
  payment_token: string;  // SharedPaymentToken from Stripe
}
```

### CompleteCheckoutResponse
```typescript
interface CompleteCheckoutResponse {
  checkout_id: string;
  status: 'completed' | 'failed';
  order_id?: string;
  failure_reason?: string;
  receipt_url?: string;
}
```

---

## STRIPE INTEGRATION

### SharedPaymentToken Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                 PAYMENT TOKEN FLOW                                   │
│                                                                      │
│  1. Buyer has payment method saved in Stripe (via Link or direct)   │
│                                                                      │
│  2. AI Agent requests SharedPaymentToken from Stripe                │
│     → Scoped to: specific merchant, specific amount, time-limited   │
│                                                                      │
│  3. Agent sends token in CompleteCheckoutRequest to merchant        │
│                                                                      │
│  4. Merchant creates PaymentIntent with the token:                  │
│                                                                      │
│     const paymentIntent = await stripe.paymentIntents.create({      │
│       amount: 13500,  // $135.00 in cents                           │
│       currency: 'usd',                                              │
│       payment_method: sharedPaymentToken,                           │
│       confirm: true,                                                │
│       // Additional fraud signals                                    │
│       metadata: {                                                    │
│         acp_checkout_id: checkout.id,                               │
│         agent_id: 'chatgpt'                                         │
│       }                                                             │
│     });                                                             │
│                                                                      │
│  5. Stripe charges the buyer's saved payment method                 │
│                                                                      │
│  6. Merchant confirms order to agent                                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Webhook Events to Handle

| Event | When | Your Action |
|-------|------|-------------|
| `payment_intent.succeeded` | Payment confirmed | Update order status, trigger fulfillment |
| `payment_intent.failed` | Payment failed | Notify agent, allow retry |
| `charge.dispute.created` | Chargeback initiated | Flag order, gather evidence |

---

## SECURITY REQUIREMENTS

### 1. HTTPS Only
All ACP endpoints must be served over HTTPS. Vercel handles this automatically.

### 2. Authorization Header
```typescript
// Validate on every request
const authHeader = req.headers.authorization;
if (!authHeader?.startsWith('Bearer ')) {
  return res.status(401).json({ error: 'Missing authorization' });
}
const token = authHeader.slice(7);
// Validate token (in production: verify with issuer)
```

### 3. Webhook Signature Verification
```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### 4. Input Validation
Use Zod schemas for all request bodies (consistent with your MCP server).

---

## PRODUCT CATALOG

### Option A: Static Demo Catalog (Recommended for MVP)
```typescript
const DEMO_PRODUCTS = [
  {
    id: 'prod_running_shoe',
    name: 'Performance Running Shoe',
    description: 'Lightweight running shoe with responsive cushioning',
    price: { amount: 12999, currency: 'usd' },
    variants: [
      { id: 'var_size_9', name: 'Size 9', in_stock: true },
      { id: 'var_size_10', name: 'Size 10', in_stock: true },
      { id: 'var_size_11', name: 'Size 11', in_stock: false },
    ],
    images: ['https://example.com/shoe.jpg'],
  },
  // Add 3-5 more products for demo
];
```

### Option B: Connect to Shopify (Advanced)
Reuse your existing MCP server's Shopify integration to pull real products.

---

## DEPLOYMENT ARCHITECTURE

### Vercel Deployment
```
┌─────────────────────────────────────────────────────────────────────┐
│                     VERCEL PROJECT                                  │
│                                                                     │
│  /api/acp/checkout.ts          → CreateCheckout handler            │
│  /api/acp/checkout/update.ts   → UpdateCheckout handler            │
│  /api/acp/checkout/complete.ts → CompleteCheckout handler          │
│  /api/acp/webhooks.ts          → Webhook handler                   │
│  /api/health.ts                → Health check                      │
│  /.well-known/acp.json         → Static discovery file             │
│                                                                     │
│  /lib/services/checkout.ts     → Checkout business logic           │
│  /lib/services/payment.ts      → Stripe integration                │
│  /lib/services/products.ts     → Product catalog                   │
│  /lib/store/checkouts.ts       → In-memory checkout store          │
│  /lib/schemas.ts               → Zod validation schemas            │
│  /lib/types.ts                 → TypeScript interfaces             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Environment Variables
```bash
# Required
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ACP_AUTH_TOKEN=your_demo_token

# Optional
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_...
```

---

## SUCCESS CRITERIA

### MVP (Must Have for Interview)
- [ ] CreateCheckout endpoint working
- [ ] UpdateCheckout endpoint working  
- [ ] CompleteCheckout endpoint working
- [ ] Stripe PaymentIntent creation
- [ ] Basic webhook handling
- [ ] Health check endpoint
- [ ] ACP discovery endpoint
- [ ] Input validation with Zod
- [ ] Error handling with proper HTTP codes
- [ ] README with architecture diagram
- [ ] Live deployment on Vercel

### Nice to Have
- [ ] Connect to real Shopify products
- [ ] Webhook signature verification
- [ ] Request logging/observability
- [ ] Rate limiting
- [ ] Multiple shipping options

### Out of Scope (Don't Build)
- Real inventory management
- Order fulfillment system
- Customer authentication
- Admin dashboard
- Email notifications

---

## INTERVIEW TALKING POINTS

### 2-Minute Pitch
"After our first conversation, I wanted to understand where Stripe is heading with AI commerce. I read about the Agentic Commerce Protocol that Stripe co-developed with OpenAI, and I decided to build a reference implementation.

I already had an MCP server that lets ChatGPT interact with Stripe and Shopify APIs. But that's the agent side — the AI using tools. ACP is the merchant side — how businesses receive orders from AI agents.

So I built an ACP-compliant merchant demo. It implements the full checkout flow: CreateCheckout to start a session, UpdateCheckout for shipping selection, and CompleteCheckout with SharedPaymentToken for payment. It integrates with Stripe for payment processing and handles webhooks for order events.

Together, these two projects show I understand both halves of agentic commerce — which I think is essential for helping platform customers navigate this transition."

### "What was hardest?"
"Understanding the trust model. In traditional e-commerce, the merchant controls the checkout UI and collects payment credentials directly. In ACP, the AI agent controls the UI and passes a SharedPaymentToken. The merchant never sees the actual card number.

I had to think carefully about what information the merchant needs to accept an order, how to validate that the token is legitimate, and how to handle cases where the payment fails after the agent has already told the user it succeeded. The webhook flow becomes critical for that last case."

### "What would you improve?"
"For a production implementation, I'd add proper database persistence instead of in-memory storage, implement the full fraud signal relay that ACP supports, and build out the product feed spec so the merchant catalog can be discovered by AI agents automatically. I'd also add observability — request tracing, latency metrics, error rates — so you can debug issues when an AI agent reports a failed checkout."

---

## RELATED PROJECTS

| Project | Purpose | Repo |
|---------|---------|------|
| MCP Server | AI agent tools for Stripe/Shopify | github.com/nickcarndt/mcp-partner-integration-demo |
| ACP Merchant Demo | Merchant checkout for AI agents | github.com/nickcarndt/acp-merchant-demo (NEW) |

---

## RESOURCES

- [ACP Specification](https://agenticcommerce.dev)
- [Stripe ACP Docs](https://docs.stripe.com/agentic-commerce/protocol)
- [OpenAI Commerce Docs](https://developers.openai.com/commerce)
- [SharedPaymentToken Docs](https://docs.stripe.com/agentic-commerce/concepts/shared-payment-tokens)
- [ACP GitHub Repo](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)

---

*Document Version: 1.0 | Created: December 29, 2025*
