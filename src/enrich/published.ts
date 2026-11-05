import type { z } from 'zod/v4';
import { graderCalibrationSchema } from './calibration.v1.js';
import { leadSchema, verifiedLeadSchema } from './lead.v1.js';
import { leadScoredSchema } from './lead-scored.v1.js';
import { rubricBandsSchema } from './rubric-bands.v1.js';

/**
 * The JSON Schemas `build-public` projects for `enrich`, as `schemas/enrich/<name>.v<major>.json` with `$id`
 * `urn:salesblaster:contracts:enrich:<name>:v<major>`. Read by the build only; not exported, and removed from the
 * built package after the projection.
 */
export const published: readonly {
  readonly name: string;
  readonly major: number;
  readonly schema: z.ZodType;
}[] = [
  { name: 'grader-calibration', major: 1, schema: graderCalibrationSchema },
  { name: 'lead', major: 1, schema: leadSchema },
  { name: 'verified-lead', major: 1, schema: verifiedLeadSchema },
  { name: 'lead-scored', major: 1, schema: leadScoredSchema },
  { name: 'rubric-bands', major: 1, schema: rubricBandsSchema },
];
