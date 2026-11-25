import { z } from 'zod/v4';
import { fieldGrammar, typeKeySchema } from '../core/index.js';
import {
  type ContactPointType,
  contactPointTypeSchema,
} from '../source/contact-point-type.v1.js';
import {
  crmHandle,
  type ExternalRef,
  externalRefsSchema,
  recordPointerTo,
} from './external-ref.v1.js';

/**
 * `person@1`: a person as the client's CRM holds them, kept as an OCP record (ADR-OCP-007, kind 2). It is a projection
 * of the CRM's own object, written by the engine into the records ref; the CRM stays its source of record. Its fields
 * are the ones SalesBlaster's own use cases read of a person (the lead a campaign enrolls), never one CRM's API.
 *
 * What this shape does not claim:
 * - it is not the person's identity: two CRMs' mirrors of one human carry different ids (the provider is inside the
 *   id), so readers compare fields and domain identity, never projection ids (ADR-OCP-007 §18);
 * - a field the CRM leaves empty is absent, never `''`.
 *
 * Its contact points are the OBSERVED part of the canonical contact-point model's ContactPoint, under ContactPoint's
 * own field names, never the whole aggregate:
 * - `type`, `handle`, `provenance`, and the CRM's own `primary` and `label`. Nothing resolution derives is stored on
 *   this mirror: no contact-point id, no normalized value or join key, no `stable_ref`, no owner, no employment.
 *   Those are the Identity context's resolution, and a stored copy would drift the day a normalizer
 *   changes.
 * - A contact point correlates and is never identity: no entry, and no value shared by two records, merges
 *   or splits anyone.
 * - When the canonical ContactPoint is published, each entry maps onto it with no second shape: `type`, `handle`
 *   and `provenance` as they are, and `owner_type` `person` unless the Identity context's resolution attributes it
 *   otherwise.
 *
 * How the adapter writes them, which no schema can check:
 * - `type` comes from the CRM binding's configuration (a field mapped to a type), never inferred from a field's label.
 * - `provenance` is `observed` only when the CRM itself declares the value was entered or imported as observed,
 *   `derived` only when it declares it computed or enriched, and otherwise `unknown`; never inferred.
 * - A type the CRM holds as one single-valued field is written `primary: true`: that one value is the CRM's declared
 *   one, and nothing is chosen. A list with no entry the CRM marks primary has no primary, and the adapter never picks.
 * - An empty or blank CRM value yields no entry at all.
 * - `label` is the CRM's own label, kept as a value: a hint, never a claim that the point belongs to an Employment or
 *   an Organization.
 */

/** A non-empty string. */
const text = z.string().min(1);

/** The record data of `person@1`. Every contact value here is `personal_data: direct`. */
export interface Person {
  /** The CRM object this record mirrors (ADR-OCP-007 §7). */
  readonly external_refs: readonly ExternalRef[];
  /** When the CRM last changed the object (the grammar's `timestamp`): the record's world time (`none`). */
  readonly source_changed_at: string;
  /** `direct`. */
  readonly first_name?: string;
  /** `direct`. */
  readonly last_name?: string;
  /** The full name as the CRM holds it (`direct`; the full name as observed). Descriptive, never a key. */
  readonly full_name?: string;
  /**
   * The primary address the CRM holds (`direct`); it contains an at sign. When `contact_points` is present, it is the
   * handle of the primary `email` entry, and absent when there is none.
   */
  readonly email?: string;
  /**
   * `direct`. When `contact_points` is present, the handle of the primary `phone` entry, and absent when there is
   * none.
   */
  readonly phone?: string;
  /** `direct`: a free-text title at a named company often singles one person out. */
  readonly title?: string;
  /**
   * `direct`. When `contact_points` is present, the handle of the primary `linkedin` entry, and absent when there is
   * none.
   */
  readonly linkedin_url?: string;
  /** The person's organization, when the CRM links one: a pointer to its `organization` record (`none`). */
  readonly organization?: string;
  /**
   * Every contact point the CRM holds for the person, observed (see the module's docblock); absent when it holds
   * none.
   */
  readonly contact_points?: readonly PersonContactPoint[];
}

/** One observed contact point of a person, as the CRM holds it. */
export interface PersonContactPoint {
  /** The canonical model's type, from the CRM binding's configuration (`none`). */
  readonly type: ContactPointType;
  /**
   * The value exactly as the CRM holds it (`direct`; the value as a human sees it): never normalized,
   * never blank. Only the primary `email` entry must look like an address, since it is then the scalar `email`; any
   * other handle is stored as held, and judging it is the Identity context's normalizer's.
   */
  readonly handle: string;
  /** How the value came to be, as the CRM declares it (`none`): `unknown` unless it declares. */
  readonly provenance: 'observed' | 'derived' | 'unknown';
  /** The CRM's primary flag for this type (`none`). */
  readonly primary?: boolean;
  /** The CRM's own label, as a value (`none`): a hint, never an Employment or owner claim. */
  readonly label?: string;
}

/**
 * The membership predicate of `person@1` (ADR-OCP-007 §8.2, §11.1). One key, `linked_to`: the record types a person
 * must be linked to to be in scope, for example `["deal"]` for the persons on an in-scope deal. The instance's
 * configuration gives its values; it narrows and never widens.
 */
export interface PersonScope {
  readonly linked_to: readonly string[];
}

/** An address: an at sign, and no whitespace. */
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+$/;

/** The scalar contact fields, each the primary handle of one type when `contact_points` is present. */
const SCALAR_OF_TYPE = {
  email: 'email',
  phone: 'phone',
  linkedin: 'linkedin_url',
} as const satisfies Partial<Record<ContactPointType, keyof Person>>;

/** `PersonContactPoint`, closed: nothing resolution derives can be stored here. */
const personContactPointSchema = z
  .object({
    type: contactPointTypeSchema,
    handle: z.string().regex(/\S/, 'non_blank_handle'),
    provenance: z.enum(['observed', 'derived', 'unknown']),
    primary: z.boolean().optional(),
    label: text.optional(),
  })
  .strict();

/**
 * `Person`, closed. Its cross-field rules, which a JSON Schema cannot state, are in `conformance/crm/person.v1.json`:
 * - `one_primary_per_type`: at most one entry of each type is `primary: true`;
 * - `primary_email_shape`: the primary `email` entry's handle is an address;
 * - `scalar_is_primary_handle`: when `contact_points` is present, `email`, `phone` and `linkedin_url` are each
 *   present if and only if their type has a primary entry, and then equal its handle exactly.
 */
export const personSchema = z
  .object({
    external_refs: externalRefsSchema,
    source_changed_at: fieldGrammar.timestamp(),
    first_name: text.optional(),
    last_name: text.optional(),
    full_name: text.optional(),
    email: z.string().regex(EMAIL_PATTERN).optional(),
    phone: text.optional(),
    title: text.optional(),
    linkedin_url: text.optional(),
    organization: recordPointerTo('organization').optional(),
    contact_points: z.array(personContactPointSchema).min(1).optional(),
  })
  .strict()
  .superRefine((person, ctx) => {
    const points = person.contact_points;
    if (points === undefined) return;
    const primaries = new Map<ContactPointType, string[]>();
    for (const point of points)
      if (point.primary === true)
        primaries.set(point.type, [
          ...(primaries.get(point.type) ?? []),
          point.handle,
        ]);
    for (const [type, handles] of primaries)
      if (handles.length > 1)
        ctx.addIssue({
          code: 'custom',
          message: 'one_primary_per_type',
          path: ['contact_points', type],
        });
    const primaryEmail = primaries.get('email')?.[0];
    if (primaryEmail !== undefined && !EMAIL_PATTERN.test(primaryEmail))
      ctx.addIssue({
        code: 'custom',
        message: 'primary_email_shape',
        path: ['contact_points'],
      });
    for (const [type, scalar] of Object.entries(SCALAR_OF_TYPE) as [
      keyof typeof SCALAR_OF_TYPE,
      (typeof SCALAR_OF_TYPE)[keyof typeof SCALAR_OF_TYPE],
    ][]) {
      if (person[scalar] !== primaries.get(type)?.[0])
        ctx.addIssue({
          code: 'custom',
          message: 'scalar_is_primary_handle',
          path: [scalar],
        });
    }
  });

/** `PersonScope`, closed: at least one record type, each a record-type key. */
export const personScopeSchema = z
  .object({
    linked_to: z.array(typeKeySchema).min(1),
  })
  .strict();

/**
 * The type facts of `person@1` (ADR-OCP-007 §8.2), as data. Each `schema` names its published schema by `$id`; a
 * generator assembling the record-type facts document replaces it with that schema's path and the sha256 of its
 * published bytes. `scope_schema` names the published membership-predicate schema the scope's grammar is checked
 * against; it is not itself a row field.
 */
export const personTypeFacts = {
  record_type: 'person',
  major: 1,
  kind: 2,
  writer: 'engine',
  ref: 'records',
  personal_data: 'direct',
  id_basis: crmHandle("The CRM's own id for the person, exactly as given."),
  schema: {
    id: 'urn:salesblaster:contracts:crm:person:v1',
    subject: 'record_data',
  },
  children: [],
  scope: [
    {
      key: 'linked_to',
      grammar: { type: 'string', cardinality: 'many', nullable: false },
    },
  ],
  scope_schema: { id: 'urn:salesblaster:contracts:crm:person-scope:v1' },
} as const;

// Every parsed value is the declared shape, checked by the compiler.
const _person = (value: z.infer<typeof personSchema>): Person => value;
const _scope = (value: z.infer<typeof personScopeSchema>): PersonScope => value;
void _person;
void _scope;
