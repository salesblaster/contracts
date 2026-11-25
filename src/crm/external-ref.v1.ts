import { z } from 'zod/v4';
import { typeKeySchema } from '../core/index.js';

/**
 * Where a projected record came from: one source object, by the source's own handle (ADR-OCP-007 §7: "Vendor ids are
 * values, inside `data` as `external_refs`"). A vendor id appears here as a value and nowhere else: never in a record's
 * id, path or name, and never as key text in another field.
 */
export interface ExternalRef {
  /** The source's own id for the object, exactly as the source gives it (`pseudonymous`). */
  readonly external_id: string;
  /** The contract's record-type key, never the vendor's object name (`none`). */
  readonly kind: string;
  /** The configured provider key for the role that read it: a configuration value, never a vendor name in code (`none`). */
  readonly provider: string;
}

/** `ExternalRef`, closed. */
export const externalRefSchema = z
  .object({
    external_id: z.string().min(1),
    kind: typeKeySchema,
    provider: typeKeySchema,
  })
  .strict();

/** The `external_refs` of a projected record: at least one, the object it was read from. */
export const externalRefsSchema = z.array(externalRefSchema).min(1);

/** `^record:<type>/<id>$` for one record type: a pointer to a record of exactly that type, with no child part. */
export const recordPointerTo = (recordType: string) =>
  z
    .string()
    .regex(new RegExp(`^record:${recordType}/k(0|[1-9][0-9]*)_[0-9a-f]{32}$`));

/**
 * The `provider_handle` id basis of a record read from the crm role (ADR-OCP-007 §7): the provider is inside the id, so
 * two CRMs' ids never collide, and the components are taken exactly as given.
 */
export const crmHandle = (externalId: string) =>
  ({
    kind: 'provider_handle',
    components: [
      {
        name: 'provider',
        canonical_form:
          'The configured provider key for the crm role, exactly as configured.',
      },
      { name: 'kind', canonical_form: 'The record type, exactly.' },
      { name: 'external_id', canonical_form: externalId },
    ],
  }) as const;

// Every parsed value is the declared shape, checked by the compiler.
const _externalRef = (value: z.infer<typeof externalRefSchema>): ExternalRef =>
  value;
void _externalRef;
