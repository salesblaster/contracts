import { z } from 'zod/v4';
import { fieldGrammar } from '../core/index.js';
import {
  crmHandle,
  type ExternalRef,
  externalRefsSchema,
  recordPointerTo,
} from './external-ref.v1.js';

/**
 * `deal@1`: a deal as the client's CRM holds it, kept as an OCP record (ADR-OCP-007, kind 2). It is a projection of the
 * CRM's own object, written by the engine into the records ref; the CRM stays its source of record. A value the engine
 * also writes into the CRM (a stage it moved the deal to) appears here as the CRM holds it, with no pointer back to
 * the decision that wrote it (ADR-OCP-007 §9.1: one generated value, one home).
 *
 * The domain term is `deal` (ADR-OCP-007 2.0.0's kind-2 row: "persons, organizations, deals"). A CRM that calls the same object by another name, such as an
 * opportunity, is mapped to `deal` by its adapter; a product's own label for its deals is not a record type.
 *
 * What this shape does not claim:
 * - `pipeline` and `stage` are configuration keys, never a CRM's raw ids: each CRM's own ids are mapped through the
 *   instance's configuration, so two CRMs' deals compare by the same keys;
 * - a field the CRM leaves empty is absent, never `''`.
 */

/** A non-empty string. */
const text = z.string().min(1);

/** An ISO 4217 alphabetic currency code. */
const CURRENCY_PATTERN = '^[A-Z]{3}$';

/** The record data of `deal@1`. */
export interface Deal {
  /** The CRM object this record mirrors (ADR-OCP-007 §7). */
  readonly external_refs: readonly ExternalRef[];
  /** When the CRM last changed the object (the grammar's `timestamp`): the record's world time (`none`). */
  readonly source_changed_at: string;
  /** The deal's title as the CRM holds it (`direct`: a free-text title often names the person it is with). */
  readonly title?: string;
  /** The pipeline, as the instance's configuration names it; never a CRM's raw id (`none`). */
  readonly pipeline: string;
  /** The stage, as the instance's configuration names it; never a CRM's raw id (`none`). */
  readonly stage: string;
  /** Where the deal stands: the state of its stage (`none`). */
  readonly status: 'open' | 'won' | 'lost';
  /**
   * What the deal is worth, when the CRM holds a value (`none`). Money is never rounded: a source value with more than
   * three decimal places is refused at parse, never rounded or truncated.
   */
  readonly value?: {
    /**
     * The grammar's `decimal` with scale 3, written with exactly three decimal places, such as `"1500.000"`. Three
     * places hold every active ISO 4217 currency's minor units except the two four-place units of account (CLF, UYW),
     * whose fourth place is refused, never rounded.
     */
    readonly amount: string;
    /** An ISO 4217 alphabetic code, such as `"EUR"`. */
    readonly currency: string;
  };
  /** The deal's person, when the CRM links one: a pointer to its `person` record (`none`). */
  readonly person?: string;
  /** The deal's organization, when the CRM links one: a pointer to its `organization` record (`none`). */
  readonly organization?: string;
  /** The deal's labels, as the instance's configuration names them; absent when it has none (`none`). */
  readonly labels?: readonly string[];
  /**
   * The cohort the deal is tagged with, as the CRM holds it, such as `"pilot-2026-11-08"`; absent when it has none
   * (`none`). It is on the record so that membership by `cohort_equals` or `cohort_prefix` is decided from the
   * record, and a sync can tell that a deal left scope (ADR-OCP-007 §11.2).
   */
  readonly cohort?: string;
}

/**
 * The membership predicate of `deal@1` (ADR-OCP-007 §8.2, §11.1). A deal is in scope when all of these hold:
 * - its `pipeline` is one of `pipelines`;
 * - when `labels` is present, it carries one of `labels`;
 * - when `cohort_equals` or `cohort_prefix` is present, its `cohort` matches either: it equals one of
 *   `cohort_equals`, or it starts with one of `cohort_prefix`. Both comparisons are exact and case-sensitive, and the
 *   two cohort keys are joined by OR.
 *
 * `labels`, `cohort_equals` and `cohort_prefix` are optional. Absent, each narrows nothing; with neither cohort key
 * present, the cohort narrows nothing. Present, each is a non-empty allow-list, so a deal with no labels, or with no
 * cohort, is then out of scope. There is no empty state: `[]` is refused. The instance's configuration gives the values;
 * they narrow and never widen.
 */
export interface DealScope {
  readonly pipelines: readonly string[];
  readonly labels?: readonly string[];
  readonly cohort_equals?: readonly string[];
  readonly cohort_prefix?: readonly string[];
}

/** `Deal`, closed at every level. */
export const dealSchema = z
  .object({
    external_refs: externalRefsSchema,
    source_changed_at: fieldGrammar.timestamp(),
    title: text.optional(),
    pipeline: text,
    stage: text,
    status: z.enum(['open', 'won', 'lost']),
    value: z
      .object({
        amount: fieldGrammar.decimal(3),
        currency: z.string().regex(new RegExp(CURRENCY_PATTERN)),
      })
      .strict()
      .optional(),
    person: recordPointerTo('person').optional(),
    organization: recordPointerTo('organization').optional(),
    labels: z.array(text).min(1).optional(),
    cohort: text.optional(),
  })
  .strict();

/**
 * `DealScope`, closed: at least one pipeline; `labels`, `cohort_equals` and `cohort_prefix`, when present, each hold
 * at least one value.
 */
export const dealScopeSchema = z
  .object({
    pipelines: z.array(text).min(1),
    labels: z.array(text).min(1).optional(),
    cohort_equals: z.array(text).min(1).optional(),
    cohort_prefix: z.array(text).min(1).optional(),
  })
  .strict();

/**
 * Whether a deal is in a scope, by `DealScope`'s predicate: the reference reading an adapter's membership test must
 * agree with. Pure; it reads only the record and the scope.
 */
export const isDealInScope = (deal: Deal, scope: DealScope): boolean => {
  if (!scope.pipelines.includes(deal.pipeline)) return false;
  const labels = scope.labels;
  if (
    labels !== undefined &&
    !(deal.labels ?? []).some((label) => labels.includes(label))
  )
    return false;
  const equals = scope.cohort_equals;
  const prefixes = scope.cohort_prefix;
  if (equals !== undefined || prefixes !== undefined) {
    const cohort = deal.cohort;
    if (cohort === undefined) return false;
    const equal = equals?.includes(cohort) ?? false;
    const prefixed =
      prefixes?.some((prefix) => cohort.startsWith(prefix)) ?? false;
    if (!equal && !prefixed) return false;
  }
  return true;
};

/**
 * The type facts of `deal@1` (ADR-OCP-007 §8.2), as data. Each `schema` names its published schema by `$id`; a
 * generator assembling the record-type facts document replaces it with that schema's path and the sha256 of its
 * published bytes. `scope_schema` names the published membership-predicate schema the scope's grammar is checked
 * against; it is not itself a row field.
 */
export const dealTypeFacts = {
  record_type: 'deal',
  major: 1,
  kind: 2,
  writer: 'engine',
  ref: 'records',
  personal_data: 'direct',
  id_basis: crmHandle("The CRM's own id for the deal, exactly as given."),
  schema: {
    id: 'urn:salesblaster:contracts:crm:deal:v1',
    subject: 'record_data',
  },
  children: [],
  scope: [
    {
      key: 'cohort_equals',
      grammar: { type: 'string', cardinality: 'many', nullable: false },
    },
    {
      key: 'cohort_prefix',
      grammar: { type: 'string', cardinality: 'many', nullable: false },
    },
    {
      key: 'labels',
      grammar: { type: 'string', cardinality: 'many', nullable: false },
    },
    {
      key: 'pipelines',
      grammar: { type: 'string', cardinality: 'many', nullable: false },
    },
  ],
  scope_schema: { id: 'urn:salesblaster:contracts:crm:deal-scope:v1' },
} as const;

// Every parsed value is the declared shape, checked by the compiler.
const _deal = (value: z.infer<typeof dealSchema>): Deal => value;
const _scope = (value: z.infer<typeof dealScopeSchema>): DealScope => value;
void _deal;
void _scope;
