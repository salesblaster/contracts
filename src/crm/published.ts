import type { z } from 'zod/v4';
import { dealSchema, dealScopeSchema } from './deal.v1.js';
import {
  organizationSchema,
  organizationScopeSchema,
} from './organization.v1.js';
import { personSchema, personScopeSchema } from './person.v1.js';

/**
 * The JSON Schemas `build-public` projects for `crm`, as `schemas/crm/<name>.v<major>.json` with `$id`
 * `urn:salesblaster:contracts:crm:<name>:v<major>`. Read by the build only; not exported, and removed from the built
 * package after the projection.
 */
export const published: readonly {
  readonly name: string;
  readonly major: number;
  readonly schema: z.ZodType;
}[] = [
  { name: 'person', major: 1, schema: personSchema },
  { name: 'person-scope', major: 1, schema: personScopeSchema },
  { name: 'organization', major: 1, schema: organizationSchema },
  { name: 'organization-scope', major: 1, schema: organizationScopeSchema },
  { name: 'deal', major: 1, schema: dealSchema },
  { name: 'deal-scope', major: 1, schema: dealScopeSchema },
];
