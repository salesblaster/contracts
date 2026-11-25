import { z } from 'zod/v4';
import { SAFE_INTEGER_MAX, typeKeySchema } from '../core/index.js';

/**
 * `classification@1`: the classifier's verdict on one inbound message, kept as a generated OCP record (ADR-OCP-007,
 * kind 3), written by the engine into the records ref. Its id derives from the classified message, the logic
 * (`classifier`), the logic's version and the attempt.
 *
 * What this shape does not claim:
 * - a verdict whose logic has no version is not a record: it has no id, so it is never emitted. It is counted by reason
 *   (`ClassificationReportNotEmitted`, `CLASSIFICATION_NOT_EMITTED_REASONS`), and the count's home is the generating
 *   unit's commit subject line on the records ref, since generated collections have no manifest in v1 (ADR-OCP-007
 *   §10, §11.3);
 * - `reason` is the model's free-text explanation of the reply, so the record is `personal_data: direct`.
 */

/** A non-empty string. */
const text = z.string().min(1);

/**
 * The derived id's `logic_version`: `<prompt name>@<prompt version>` of the logic that produced the verdict. Neither
 * part may be `unknown` (a producer that omitted it), and the version may not begin with `committed`, whatever follows
 * (`committed`, `committed-ab12`, `committed:ab`, ...): the hashed form of a committed-prompt version is not defined
 * yet, so this major fails closed. A later minor may accept it once it is defined, since that widens what is accepted.
 */
const CLASSIFICATION_LOGIC_VERSION_PATTERN =
  '^(?!unknown@)[^@\\s]+@(?!unknown$)(?!committed)[^@\\s]+$';

/**
 * An emitted verdict's prompt name: not `unknown`, and no `@` or white space. With the prompt version's pattern, the two
 * fields always form a valid `logic_version`, so an emitted verdict's id can always be derived.
 */
const PROMPT_NAME_PATTERN = '^(?!unknown$)[^@\\s]+$';

/** An emitted verdict's prompt version: not `unknown`, and not beginning with `committed`. */
const PROMPT_VERSION_PATTERN = '^(?!unknown$)(?!committed)[^@\\s]+$';

/** A decimal in [0, 1], as a string: the verdict's confidence. */
const UNIT_DECIMAL_PATTERN = '^(?:0(?:\\.[0-9]+)?|1(?:\\.0+)?)$';

/**
 * The five outcome categories a verdict routes by, declared once in this file: the schema takes its enum from here.
 * They are the same five as `email.classified` v2's `category`, and a repository check binds every declaration of
 * them to the same set.
 */
const CLASSIFICATION_CATEGORIES = [
  'DESIRED',
  'RETRIABLE',
  'REDIRECTABLE',
  'TERMINAL_NEGATIVE',
  'TERMINAL_NEUTRAL',
] as const;

/** The record data of `classification@1`. */
export interface Classification {
  readonly label_key: string;
  readonly subtype?: string;
  readonly category:
    | 'DESIRED'
    | 'RETRIABLE'
    | 'REDIRECTABLE'
    | 'TERMINAL_NEGATIVE'
    | 'TERMINAL_NEUTRAL';
  readonly sentiment: 'positive' | 'neutral' | 'negative';
  readonly suppress_org_wide: boolean;
  /** A closed detector-vocabulary value, never reply text. */
  readonly forced_suppression_phrase?: string;
  /** A decimal in [0, 1], as a string. */
  readonly confidence: string;
  /** The model's explanation: free text about the reply. */
  readonly reason: string;
  readonly needs_human_review: boolean;
  readonly review_reasons: readonly string[];
  readonly source: 'internal_llm';
  readonly model?: string;
  /** The logic's prompt name: not `unknown`, and no `@` or white space. */
  readonly prompt_name: string;
  /** Present on every emitted verdict: one without it, `unknown`, or beginning with `committed` is not emitted. */
  readonly prompt_version: string;
}

/**
 * Why a classification verdict is not emitted: the closed set of reason tokens. A verdict with no prompt version,
 * `unknown`, or a version beginning with `committed` has no `logic_version` and so no id
 * (`classification_without_logic_version`). Each token is a lowercase key, so it is safe in a commit subject line: it
 * names a reason, never a contact value, a name or a vendor id.
 *
 * Writer-closed, reader-open. A producer reports only the tokens in this set, every one of them
 * (`classificationNotEmittedReasonSchema`, `classificationReportNotEmittedSchema`). A reader accepts any token in the
 * token grammar that it does not know, keeps its count under that token's own name, and never fails on it
 * (`classificationReportNotEmittedReaderSchema`). So a new token is an additive minor version of this set: old readers
 * keep its count and ignore its meaning. A reader also accepts a set that lacks a token it knows, since a producer
 * older than that token never writes it; it treats the absent token as not reported, never as `0`.
 */
export const CLASSIFICATION_NOT_EMITTED_REASONS = [
  'classification_without_logic_version',
] as const;

export type ClassificationNotEmittedReason =
  (typeof CLASSIFICATION_NOT_EMITTED_REASONS)[number];

/**
 * The per-reason counts of verdicts a producer did not emit, as it reports them to its generating unit: every reason
 * present, `0` when none. Generated collections have no manifest in v1 (ADR-OCP-007 §11.3), so the counts' home is
 * that unit's one commit on the records ref (§10: one commit per unit of work, its subject line carrying counts and
 * never a contact value, a name or a vendor id), one count per reason token. A unit that writes no record still makes
 * that commit, with its tree unchanged, so a count of verdicts with no version is never lost.
 */
export interface ClassificationReportNotEmitted {
  readonly classification_without_logic_version: number;
}

/** The per-reason counts as a reader takes them: any token in the token grammar, each with its count. */
export type ClassificationNotEmittedCounts = Readonly<Record<string, number>>;

/** A reason token as a producer writes it: closed to the published set. */
export const classificationNotEmittedReasonSchema = z.enum(
  CLASSIFICATION_NOT_EMITTED_REASONS,
);

/** The derived id's `logic_version` grammar: a producer decides emit or count by it. */
export const classificationLogicVersionSchema = z
  .string()
  .regex(new RegExp(CLASSIFICATION_LOGIC_VERSION_PATTERN));

/** `Classification`, closed. */
export const classificationSchema = z
  .object({
    label_key: text,
    subtype: text.optional(),
    category: z.enum(CLASSIFICATION_CATEGORIES),
    sentiment: z.enum(['positive', 'neutral', 'negative']),
    suppress_org_wide: z.boolean(),
    forced_suppression_phrase: text.optional(),
    confidence: z.string().regex(new RegExp(UNIT_DECIMAL_PATTERN)),
    reason: z.string(),
    needs_human_review: z.boolean(),
    review_reasons: z.array(text),
    source: z.literal('internal_llm'),
    model: text.optional(),
    prompt_name: z.string().regex(new RegExp(PROMPT_NAME_PATTERN)),
    prompt_version: z.string().regex(new RegExp(PROMPT_VERSION_PATTERN)),
  })
  .strict();

/** A count: the grammar's integer, at least 0. */
const count = z.number().int().min(0).max(SAFE_INTEGER_MAX);

/**
 * `ClassificationReportNotEmitted` as a producer writes it, closed: a non-negative count for each reason token, every
 * token present, and no other key.
 */
export const classificationReportNotEmittedSchema = z
  .object({
    classification_without_logic_version: count,
  })
  .strict();

/**
 * The same counts as a reader takes them, open: every key is a token in the token grammar (a lowercase key, the same
 * grammar as a type key) and every value a non-negative count. A token the reader does not know is kept, never refused.
 * A token it knows may be absent: that count is not reported, which is not the same as `0`.
 * This is a reader's schema, not a published JSON Schema: the published one is the writer's.
 */
export const classificationReportNotEmittedReaderSchema = z.record(
  typeKeySchema,
  count,
);

/**
 * The type facts of `classification@1` (ADR-OCP-007 §8.2), as data. `schema` names the published schema by `$id`; a
 * generator assembling the record-type facts document replaces it with that schema's path and the sha256 of its
 * published bytes. The type declares no scope, so it names no scope schema.
 */
export const classificationTypeFacts = {
  record_type: 'classification',
  major: 1,
  kind: 3,
  writer: 'engine',
  ref: 'records',
  personal_data: 'direct',
  id_basis: {
    kind: 'derived',
    components: [
      {
        name: 'subject',
        canonical_form:
          'record:conversation/<id>#message/<id>, the classified inbound message.',
      },
      { name: 'logic', canonical_form: 'classifier' },
      {
        name: 'logic_version',
        canonical_form:
          '<prompt name>@<prompt version> of the logic that produced the verdict; unknown, and any version beginning committed, are not versions.',
      },
      { name: 'attempt', canonical_form: '1: one verdict per reply.' },
    ],
  },
  schema: {
    id: 'urn:salesblaster:contracts:sdr:classification:v1',
    subject: 'record_data',
  },
  children: [],
  scope: [],
} as const;

// Every parsed value is the declared shape, checked by the compiler.
const _classification = (
  value: z.infer<typeof classificationSchema>,
): Classification => value;
const _report = (
  value: z.infer<typeof classificationReportNotEmittedSchema>,
): ClassificationReportNotEmitted => value;
void _classification;
void _report;
const _readerCounts = (
  value: z.infer<typeof classificationReportNotEmittedReaderSchema>,
): ClassificationNotEmittedCounts => value;
void _readerCounts;
