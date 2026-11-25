import { z } from 'zod/v4';
import { fieldGrammar, typeKeySchema } from '../core/index.js';
import {
  crmHandle,
  type ExternalRef,
  externalRefsSchema,
} from './external-ref.v1.js';

/**
 * `organization@1`: an organization as the client's CRM holds it, kept as an OCP record (ADR-OCP-007, kind 2). It is a
 * projection of the CRM's own object, written by the engine into the records ref; the CRM stays its source of record.
 *
 * What this shape does not claim:
 * - it is not the organization's identity: two CRMs' mirrors of one organization carry different ids, so readers
 *   compare fields and `organization_key`, never projection ids (ADR-OCP-007 §18);
 * - it carries no contact value: an organization's own address or phone can be a person's, so v1 leaves them out and
 *   the type stays `personal_data: none`. A later minor may add them, with the class they need.
 */

/** A non-empty string. */
const text = z.string().min(1);

/** A lowercase hostname with at least one dot: `example.com`, never a URL. */
const DOMAIN_PATTERN =
  '^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$';

/**
 * The canonical Organization key in its reference form: `ref_key:<ref id>`, `domain_key:<domain>` or
 * `record_key:<json>`. It is the same form the Organization identity's own events carry, and it never holds a vendor
 * id: a vendor identifier is represented by a randomly minted reference, never by its value.
 */
const ORGANIZATION_KEY_PATTERN = '^(?:ref_key|domain_key|record_key):.+$';

/** The record data of `organization@1`. */
export interface Organization {
  /** The CRM object this record mirrors (ADR-OCP-007 §7). */
  readonly external_refs: readonly ExternalRef[];
  /** When the CRM last changed the object (the grammar's `timestamp`): the record's world time (`none`). */
  readonly source_changed_at: string;
  /**
   * The organization's name as the CRM holds it (`none`, as the published lead's company name is). A sole trader's
   * business name is often their own name; the class of company names across contracts is an open canon question.
   */
  readonly name: string;
  /** Its domain, a lowercase hostname such as `example.com`, never a URL (`none`). */
  readonly domain?: string;
  /** Its website as the CRM holds it (`none`). */
  readonly website?: string;
  /**
   * The canonical Organization this mirror resolves to, in the reference form (`none`). Present only when the runtime
   * has resolved it; absent otherwise. Never a vendor id.
   */
  readonly organization_key?: string;
}

/**
 * The membership predicate of `organization@1` (ADR-OCP-007 §8.2, §11.1). One key, `linked_to`: the record types an
 * organization must be linked to to be in scope, for example `["deal"]`. The instance's configuration gives its
 * values; it narrows and never widens.
 */
export interface OrganizationScope {
  readonly linked_to: readonly string[];
}

/** `Organization`, closed. */
export const organizationSchema = z
  .object({
    external_refs: externalRefsSchema,
    source_changed_at: fieldGrammar.timestamp(),
    name: text,
    domain: z.string().regex(new RegExp(DOMAIN_PATTERN)).optional(),
    website: text.optional(),
    organization_key: z
      .string()
      .regex(new RegExp(ORGANIZATION_KEY_PATTERN))
      .optional(),
  })
  .strict();

/** `OrganizationScope`, closed: at least one record type, each a record-type key. */
export const organizationScopeSchema = z
  .object({ linked_to: z.array(typeKeySchema).min(1) })
  .strict();

/**
 * The type facts of `organization@1` (ADR-OCP-007 §8.2), as data. Each `schema` names its published schema by `$id`; a
 * generator assembling the record-type facts document replaces it with that schema's path and the sha256 of its
 * published bytes. `scope_schema` names the published membership-predicate schema the scope's grammar is checked
 * against; it is not itself a row field.
 */
export const organizationTypeFacts = {
  record_type: 'organization',
  major: 1,
  kind: 2,
  writer: 'engine',
  ref: 'records',
  personal_data: 'none',
  id_basis: crmHandle(
    "The CRM's own id for the organization, exactly as given.",
  ),
  schema: {
    id: 'urn:salesblaster:contracts:crm:organization:v1',
    subject: 'record_data',
  },
  children: [],
  scope: [
    {
      key: 'linked_to',
      grammar: { type: 'string', cardinality: 'many', nullable: false },
    },
  ],
  scope_schema: { id: 'urn:salesblaster:contracts:crm:organization-scope:v1' },
} as const;

// Every parsed value is the declared shape, checked by the compiler.
const _organization = (
  value: z.infer<typeof organizationSchema>,
): Organization => value;
const _scope = (
  value: z.infer<typeof organizationScopeSchema>,
): OrganizationScope => value;
void _organization;
void _scope;
