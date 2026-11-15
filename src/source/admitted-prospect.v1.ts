import { z } from 'zod/v4';
import { fieldGrammar } from '../core/index.js';
import { type Lead, leadSchema } from '../enrich/lead.v1.js';
import { REJECT_REASONS, type RejectReason } from './reject-reason.v1.js';
import {
  type TitleFamilyTableRef,
  titleFamilyTableRefSchema,
} from './title-family.v1.js';

/**
 * `AdmittedProspect`: one lead as admission hands it to enrichment. It is `Lead`'s fields with admission's additions,
 * so the published face carries one lead shape: in code it extends `Lead`, never copies it. Every field is a string,
 * and a value the source does not hold is absent: never `null`, never `""`. The rules the grammar cannot state are in
 * `conformance/source/admitted-prospect-batch.v1.json`; how a batch's rows merge into prospects is in
 * `conformance/source/admission-merge.v1.json`.
 *
 * What this shape does not claim:
 * - it names no survivorship mechanism: the merge it shows is within one batch, the first row kept and later rows
 *   filling only what it lacks;
 * - matching a prospect to another source's record, or to an existing person, stays each runtime's own;
 * - per-field normalization of the fields compared as `deterministic` (every prospect field but `emailAccountKey`,
 *   `companyDomain`, `globalContactId` and `globalCompanyId`) is not specified here; it follows in a later version.
 */
export interface AdmittedProspect extends Lead {
  /** `direct`. */
  readonly fullName?: string;
  /**
   * The title's buyer family (`none`): present only when the batch's `declaration.titleFamilyTable` is set, and then
   * one of that table's closed `families`, `other` included. Absent when the title is absent.
   */
  readonly titleFamily?: string;
  /** The producing runtime's own opaque organization id (`none`). It is not compared across runtimes. */
  readonly globalCompanyId?: string;
  /** Where the record came from (`none`). It never holds a vendor's record id. */
  readonly provenance: {
    readonly acquisitionSource: string;
    readonly acquisitionRef?: string;
  };
}

/**
 * One admission's output, handed to enrichment as a port argument rather than in an event envelope, so it carries its
 * own major in `schemaVersion`. `tenantId` is a cross-check, never authority: the consumer takes its tenant from its
 * own trusted edge and refuses a batch whose `tenantId` differs.
 */
export interface AdmittedProspectBatch {
  readonly shape: 'source.admitted-prospect-batch';
  readonly schemaVersion: 1;
  readonly tenantId: string;
  /** The admission record this batch came from: the audit join key. Opaque. */
  readonly admissionId: string;
  /** The segment whose membership this batch is, once one exists. Opaque. */
  readonly segmentId?: string;
  /** When admission ran (the grammar's `timestamp`). */
  readonly admittedAt: string;
  readonly declaration: {
    /** Whether the tenant declared a field set. */
    readonly fieldSet: 'declared' | 'undeclared';
    /** The declared fields, in this shape's names: present exactly when `fieldSet` is `declared`. */
    readonly fields?: readonly string[];
    /** The `title_family` table admission used, if any. */
    readonly titleFamilyTable?: TitleFamilyTableRef;
  };
  /** Zero or more: an empty batch is valid and says so. */
  readonly prospects: readonly AdmittedProspect[];
  readonly counts: {
    readonly in: number;
    /** Equals `prospects.length`. */
    readonly admitted: number;
    /** Every reason, each counted once per row. */
    readonly rejected: Readonly<Record<RejectReason, number>>;
  };
}

/** `AdmittedProspect`, closed, in the grammar's types only. */
export const admittedProspectSchema = leadSchema
  .extend({
    fullName: fieldGrammar.string().optional(),
    titleFamily: fieldGrammar.string().optional(),
    globalCompanyId: fieldGrammar.string().optional(),
    provenance: z
      .object({
        acquisitionSource: fieldGrammar.string(),
        acquisitionRef: fieldGrammar.string().optional(),
      })
      .strict(),
  })
  .strict();

const rejectedCounts = z
  .object(
    Object.fromEntries(
      REJECT_REASONS.map((r) => [r, fieldGrammar.integer()]),
    ) as Record<RejectReason, ReturnType<typeof fieldGrammar.integer>>,
  )
  .strict();

/** `AdmittedProspectBatch`, closed at every level. */
export const admittedProspectBatchSchema = z
  .object({
    shape: z.literal('source.admitted-prospect-batch'),
    schemaVersion: z.literal(1),
    tenantId: fieldGrammar.string(),
    admissionId: fieldGrammar.string(),
    segmentId: fieldGrammar.string().optional(),
    admittedAt: fieldGrammar.timestamp(),
    declaration: z
      .object({
        fieldSet: z.enum(['declared', 'undeclared']),
        fields: z.array(fieldGrammar.string()).optional(),
        titleFamilyTable: titleFamilyTableRefSchema.optional(),
      })
      .strict(),
    prospects: z.array(admittedProspectSchema),
    counts: z
      .object({
        in: fieldGrammar.integer(),
        admitted: fieldGrammar.integer(),
        rejected: rejectedCounts,
      })
      .strict(),
  })
  .strict();
