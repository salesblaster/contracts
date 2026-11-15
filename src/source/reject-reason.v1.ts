import { z } from 'zod/v4';

/**
 * Admission's one closed reject vocabulary: every runtime maps its own reasons onto these four, so a batch's
 * `counts.rejected` compares across runtimes. A new reason is an additive version.
 *
 * Three reasons refuse a row, and one merges it:
 * - `no_field_survived_allow_list`, `no_identifying_field` and `invalid_email` **refuse** the row. No value of a
 *   refused row appears in any output.
 * - `duplicate_in_batch` means the row was **merged, not dropped**. Rows are grouped only by `core.email-account-key`,
 *   and the first row in input order that is not refused is the prospect. A later row only fills the prospect's absent
 *   fields and never replaces a value it holds; a value is absent when it is empty or white space, or when its
 *   normalization yields nothing. Each later row is counted once under this reason, and no merged-away value appears
 *   anywhere.
 *
 * The admission record holds no value of any row, whichever reason applies. The merge is within one batch only: it
 * names no survivorship mechanism, and matching a prospect to another source's record or to an existing person stays
 * each runtime's own. The vectors are `conformance/source/admission-merge.v1.json`.
 */
export const REJECT_REASONS = [
  'no_field_survived_allow_list',
  'no_identifying_field',
  'invalid_email',
  'duplicate_in_batch',
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];

export const rejectReasonSchema = z.enum(REJECT_REASONS);
