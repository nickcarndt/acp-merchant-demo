import { z } from 'zod';

// -----------------------------------------------------------------------------
// Common Schemas
// -----------------------------------------------------------------------------

export const MoneySchema = z.object({
  amount: z.number().int().min(0),
  currency: z.string().length(3).toLowerCase(),
});

export const AddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postal_code: z.string().min(1),
  country: z.string().length(2).toUpperCase(),
});

// -----------------------------------------------------------------------------
// Request Schemas
// -----------------------------------------------------------------------------

export const LineItemSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
  variant_id: z.string().optional(),
});

export const CreateCheckoutRequestSchema = z.object({
  checkout_reference_id: z.string().min(1).max(255),
  line_items: z.array(LineItemSchema).min(1).max(50),
  buyer_context: z.object({
    locale: z.string().optional(),
    currency: z.string().length(3).optional(),
    shipping_country: z.string().length(2).optional(),
  }).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const UpdateCheckoutRequestSchema = z.object({
  checkout_id: z.string().min(1),
  shipping_option_id: z.string().optional(),
  shipping_address: AddressSchema.optional(),
  billing_address: AddressSchema.optional(),
  buyer_email: z.string().email().optional(),
  buyer_phone: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const CompleteCheckoutRequestSchema = z.object({
  checkout_id: z.string().min(1),
  payment_token: z.string().min(1),
});

// -----------------------------------------------------------------------------
// Type Exports (inferred from schemas)
// -----------------------------------------------------------------------------

export type CreateCheckoutRequestInput = z.infer<typeof CreateCheckoutRequestSchema>;
export type UpdateCheckoutRequestInput = z.infer<typeof UpdateCheckoutRequestSchema>;
export type CompleteCheckoutRequestInput = z.infer<typeof CompleteCheckoutRequestSchema>;

