import type { z } from 'zod/v4';
import {
  classificationReportNotEmittedSchema,
  classificationSchema,
} from './classification.v1.js';

/**
 * The JSON Schemas `build-public` projects for `sdr`, as `schemas/sdr/<name>.v<major>.json` with `$id`
 * `urn:salesblaster:contracts:sdr:<name>:v<major>`. Read by the build only; not exported, and removed from the built
 * package after the projection.
 */
export const published: readonly {
  readonly name: string;
  readonly major: number;
  readonly schema: z.ZodType;
}[] = [
  { name: 'classification', major: 1, schema: classificationSchema },
  {
    name: 'classification-report-not-emitted',
    major: 1,
    schema: classificationReportNotEmittedSchema,
  },
];
