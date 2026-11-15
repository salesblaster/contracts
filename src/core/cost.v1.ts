import { z } from 'zod/v4';
import { SAFE_INTEGER_MAX } from './grammar.v1.js';
import type { Cost } from './types.v1.js';

/**
 * `Cost`, closed, with all four of its invariants. The first two hold per field and project into the JSON Schema.
 * The cross-field pair (`basis` `unknown` exactly when `units` is `null`; an `amount` needs `currency` and
 * `priceVersion`) is enforced by this parse and by the shipped conformance vectors (`conformance/cost.v1.json`).
 */
export const costSchema = z
  .object({
    units: z.number().int().min(0).max(SAFE_INTEGER_MAX).nullable(),
    unitKind: z.enum(['credits', 'tokens', 'runs', 'rows']),
    basis: z.enum(['vendor_stated', 'presumed_per_call', 'unknown']),
    amount: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .nullable(),
    currency: z.string().nullable(),
    priceVersion: z.string().nullable(),
  })
  .strict()
  .refine((cost) => (cost.basis === 'unknown') === (cost.units === null), {
    message: 'basis "unknown" goes with null units, and only with them',
  })
  .refine(
    (cost) =>
      cost.amount === null ||
      (cost.currency !== null && cost.priceVersion !== null),
    { message: 'an amount needs its currency and priceVersion' },
  );

// Every parsed value is a `Cost`, checked by the compiler. The plain type is wider: it cannot state the invariants.
type Parsed = z.infer<typeof costSchema>;
const _parsedIsCost = (value: Parsed): Cost => value;
void _parsedIsCost;
