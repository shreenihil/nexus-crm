import { z } from 'zod';

export const productBillingPeriodSchema = z.enum(['one_time', 'monthly', 'annual']);
export type ProductBillingPeriod = z.infer<typeof productBillingPeriodSchema>;

export const productSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  billingPeriod: productBillingPeriodSchema.default('one_time'),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Product = z.infer<typeof productSchema>;

export const quoteLineItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  sku: z.string(),
  billingPeriod: productBillingPeriodSchema,
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).default(0),
  totalPrice: z.number().nonnegative(),
});

export type QuoteLineItem = z.infer<typeof quoteLineItemSchema>;

export const quoteStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'accepted',
  'declined',
]);
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const quoteSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  dealId: z.string(),
  quoteNumber: z.string(),
  lineItems: z.array(quoteLineItemSchema),
  subtotal: z.number().nonnegative(),
  volumeDiscountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().nonnegative(),
  taxRatePercent: z.number().min(0).max(100).default(0),
  taxAmount: z.number().nonnegative(),
  total: z.number().nonnegative(),
  arr: z.number().nonnegative().default(0),
  tcv: z.number().nonnegative().default(0),
  status: quoteStatusSchema.default('draft'),
  requiresApproval: z.boolean().default(false),
  approvalNotes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Quote = z.infer<typeof quoteSchema>;

export const DISCOUNT_APPROVAL_THRESHOLD_PERCENT = 20;

/**
 * Calculates line-item totals, subtotal, volume discounts, taxes, ARR, TCV, and approval gates.
 */
export function calculateQuoteTotals(
  rawItems: Array<{
    productId: string;
    productName: string;
    sku: string;
    billingPeriod: ProductBillingPeriod;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
  }>,
  volumeDiscountPercent: number = 0,
  taxRatePercent: number = 0
): {
  lineItems: QuoteLineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  arr: number;
  tcv: number;
  requiresApproval: boolean;
} {
  let subtotal = 0;
  let arr = 0;
  let tcv = 0;
  let hasHeavyLineDiscount = false;

  const processedItems: QuoteLineItem[] = rawItems.map((item, idx) => {
    const qty = Math.max(1, Math.floor(item.quantity || 1));
    const price = Math.max(0, item.unitPrice || 0);
    const lineDiscount = Math.min(100, Math.max(0, item.discountPercent || 0));

    if (lineDiscount > DISCOUNT_APPROVAL_THRESHOLD_PERCENT) {
      hasHeavyLineDiscount = true;
    }

    const rawLine = qty * price;
    const discountedLine = rawLine * (1 - lineDiscount / 100);
    const finalLineTotal = Math.round(discountedLine * 100) / 100;

    subtotal += finalLineTotal;

    // Calculate ARR & TCV contributions
    if (item.billingPeriod === 'monthly') {
      arr += finalLineTotal * 12;
      tcv += finalLineTotal * 12; // 1-year baseline for contract value
    } else if (item.billingPeriod === 'annual') {
      arr += finalLineTotal;
      tcv += finalLineTotal;
    } else {
      tcv += finalLineTotal; // one-time fee
    }

    return {
      id: `line-${idx + 1}`,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      billingPeriod: item.billingPeriod,
      quantity: qty,
      unitPrice: price,
      discountPercent: lineDiscount,
      totalPrice: finalLineTotal,
    };
  });

  const volDiscount = Math.min(100, Math.max(0, volumeDiscountPercent));
  const discountAmount = Math.round(subtotal * (volDiscount / 100) * 100) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = Math.min(100, Math.max(0, taxRatePercent));
  const taxAmount = Math.round(taxableAmount * (taxRate / 100) * 100) / 100;
  const total = Math.round((taxableAmount + taxAmount) * 100) / 100;

  // If either volume discount or any line discount exceeds threshold, trigger approval workflow
  const requiresApproval = volDiscount > DISCOUNT_APPROVAL_THRESHOLD_PERCENT || hasHeavyLineDiscount;

  return {
    lineItems: processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount,
    taxAmount,
    total,
    arr: Math.round(arr * (1 - volDiscount / 100) * 100) / 100,
    tcv: Math.round((tcv - discountAmount) * 100) / 100,
    requiresApproval,
  };
}
