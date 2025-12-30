# ACP Merchant Demo

A reference implementation of the [Agentic Commerce Protocol](https://agenticcommerce.dev) (ACP), demonstrating how merchants can accept checkouts from AI agents like ChatGPT.

## What is ACP?

ACP is an open standard co-developed by Stripe and OpenAI that enables AI agents to initiate and complete purchases on behalf of users. This demo implements the merchant side of the protocol.

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   User      │────▶│   AI Agent      │────▶│  This Server │
│   (Buyer)   │     │   (ChatGPT)     │     │  (Merchant)  │
└─────────────┘     └─────────────────┘     └──────────────┘
                           │                       │
                           │                       ▼
                           │                ┌──────────────┐
                           │                │   Stripe     │
                           └───────────────▶│   (Payment)  │
                                            └──────────────┘
```

### Checkout Flow

```
CreateCheckout → UpdateCheckout → CompleteCheckout
     ↓                 ↓                  ↓
  CREATED    →     PENDING     →  READY_FOR_PAYMENT  →  PROCESSING  →  COMPLETED
                                                                            ↓
                                                                         FAILED
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/acp/checkout` | POST | Create a new checkout session |
| `/api/acp/checkout/update` | POST | Update checkout (shipping, address) |
| `/api/acp/checkout/complete` | POST | Complete with payment token |
| `/api/acp/webhooks` | POST | Handle Stripe webhooks |
| `/api/health` | GET | Health check with store stats |
| `/.well-known/acp.json` | GET | ACP discovery endpoint |

## Quick Start

```bash
# Clone and install
git clone https://github.com/nickcarndt/acp-merchant-demo.git
cd acp-merchant-demo
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Stripe keys

# Run locally
npm run dev
```

## Environment Variables

```bash
# Required
STRIPE_SECRET_KEY=sk_test_...        # Your Stripe test secret key
STRIPE_WEBHOOK_SECRET=whsec_...      # Stripe webhook signing secret
ACP_AUTH_TOKEN=your_token_here       # Bearer token for ACP requests

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Testing

```bash
# Run smoke tests (requires jq)
./test-acp.sh
```

### Manual Test Flow

```bash
# 1. Health check
curl http://localhost:3000/api/health | jq

# 2. Create checkout
curl -X POST http://localhost:3000/api/acp/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo_acp_token_12345" \
  -d '{
    "checkout_reference_id": "test_001",
    "line_items": [
      { "product_id": "prod_running_shoe", "quantity": 1, "variant_id": "var_size_10" }
    ]
  }'

# 3. Update with shipping/email (use checkout_id from step 2)
curl -X POST http://localhost:3000/api/acp/checkout/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo_acp_token_12345" \
  -d '{
    "checkout_id": "YOUR_CHECKOUT_ID",
    "shipping_option_id": "ship_standard",
    "buyer_email": "test@example.com",
    "shipping_address": {
      "line1": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "postal_code": "94102",
      "country": "US"
    }
  }'

# 4. Complete checkout
curl -X POST http://localhost:3000/api/acp/checkout/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo_acp_token_12345" \
  -d '{
    "checkout_id": "YOUR_CHECKOUT_ID",
    "payment_token": "demo_spt_token"
  }'
```

## Demo Products

| Product ID | Name | Price |
|------------|------|-------|
| `prod_running_shoe` | Performance Running Shoe | $129.99 |
| `prod_wireless_earbuds` | Pro Wireless Earbuds | $199.99 |
| `prod_laptop_stand` | Ergonomic Laptop Stand | $79.99 |
| `prod_water_bottle` | Insulated Water Bottle | $34.99 |

## Shipping Options

| Option ID | Name | Price | Days |
|-----------|------|-------|------|
| `ship_standard` | Standard Shipping | $5.99 | 5-7 |
| `ship_express` | Express Shipping | $12.99 | 2-3 |
| `ship_overnight` | Overnight Shipping | $24.99 | 1 |

## Project Structure

```
src/
├── app/
│   └── api/
│       ├── acp/
│       │   ├── checkout/
│       │   │   ├── route.ts         # Create checkout
│       │   │   ├── update/route.ts  # Update checkout
│       │   │   └── complete/route.ts # Complete checkout
│       │   └── webhooks/route.ts    # Stripe webhooks
│       └── health/route.ts          # Health check
└── lib/
    ├── middleware/auth.ts           # ACP auth validation
    ├── schemas/acp.ts               # Zod validation schemas
    ├── services/
    │   ├── checkout.ts              # Checkout business logic
    │   ├── payment.ts               # Stripe integration
    │   ├── products.ts              # Product catalog
    │   └── stripe.ts                # Stripe client
    ├── store/checkouts.ts           # In-memory checkout store
    └── types/acp.ts                 # TypeScript interfaces
```

## Deployment

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/acp/webhooks`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.dispute.created`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## Related Projects

- [MCP Server](https://github.com/nickcarndt/mcp-partner-integration-demo) - AI agent tools for Stripe/Shopify

## Resources

- [ACP Specification](https://agenticcommerce.dev)
- [Stripe ACP Docs](https://docs.stripe.com/agentic-commerce/protocol)
- [OpenAI Commerce Docs](https://developers.openai.com/commerce)
- [SharedPaymentToken Docs](https://docs.stripe.com/agentic-commerce/concepts/shared-payment-tokens)

## Author

Nicholas Arndt - [GitHub](https://github.com/nickcarndt)

---

*Built for Stripe SA Interview Demo - January 2025*
