import type { z } from 'zod/v4';
import {
  admittedProspectBatchSchema,
  admittedProspectSchema,
} from './admitted-prospect.v1.js';
import { rejectReasonSchema } from './reject-reason.v1.js';
import {
  titleFamilyTableRefSchema,
  titleFamilyTableSchema,
} from './title-family.v1.js';

/**
 * The JSON Schemas `build-public` projects for `source`, as `schemas/source/<name>.v<major>.json` with `$id`
 * `urn:salesblaster:contracts:source:<name>:v<major>`. Read by the build only; not exported, and removed from the
 * built package after the projection.
 */
export const published: readonly {
  readonly name: string;
  readonly major: number;
  readonly schema: z.ZodType;
}[] = [
  { name: 'admitted-prospect', major: 1, schema: admittedProspectSchema },
  {
    name: 'admitted-prospect-batch',
    major: 1,
    schema: admittedProspectBatchSchema,
  },
  { name: 'reject-reason', major: 1, schema: rejectReasonSchema },
  { name: 'title-family-table', major: 1, schema: titleFamilyTableSchema },
  {
    name: 'title-family-table-ref',
    major: 1,
    schema: titleFamilyTableRefSchema,
  },
];
