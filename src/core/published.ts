import type { z } from 'zod/v4';
import { portErrorSchema } from './errors.v1.js';
import {
  markdownPointerSchema,
  recordIdSchema,
  recordPointerSchema,
  typeKeySchema,
} from './ids.v1.js';

/**
 * The JSON Schemas `build-public` projects for `core`, as `schemas/core/<name>.v<major>.json` with `$id`
 * `urn:salesblaster:contracts:core:<name>:v<major>`. Read by the build only; not exported, and removed from the
 * built package after the projection.
 */
export const published: readonly {
  readonly name: string;
  readonly major: number;
  readonly schema: z.ZodType;
}[] = [
  { name: 'type-key', major: 1, schema: typeKeySchema },
  { name: 'record-id', major: 1, schema: recordIdSchema },
  { name: 'record-pointer', major: 1, schema: recordPointerSchema },
  { name: 'markdown-pointer', major: 1, schema: markdownPointerSchema },
  { name: 'port-error', major: 1, schema: portErrorSchema },
];
