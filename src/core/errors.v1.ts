import { z } from 'zod/v4';
import type { PortError } from './types.v1.js';

/** The vendor-neutral error arms (see `PortError`), as a closed schema. */
export const portErrorSchema = z
  .object({
    kind: z.enum(['unavailable', 'request_failed']),
    message: z.string(),
  })
  .strict();

// The schema and the plain type agree, checked by the compiler in both directions.
type Parsed = z.infer<typeof portErrorSchema>;
const _typeMatchesSchema = (value: PortError): Parsed => value;
const _schemaMatchesType = (value: Parsed): PortError => value;
void _typeMatchesSchema;
void _schemaMatchesType;
