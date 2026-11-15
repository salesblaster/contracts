import type { MeteredPortResult } from '../core/index.js';
import type { VerificationStatus } from './lead.v1.js';

/** One address's verdict, under the address exactly as it was submitted. */
export interface EmailVerificationVerdict {
  readonly email: string;
  readonly status: VerificationStatus;
}

/**
 * Verify a batch of email addresses (mapping E-1). Enrich owns what each verdict means:
 * - an unrecognised vendor status is `unknown` (fail closed);
 * - `catch_all` is distinct from `risky`, and whether to send to a catch-all address is the campaign's policy;
 * - `risky` includes disposable and do-not-mail addresses.
 *
 * Totality: exactly one verdict per distinct submitted address, in any order, each under the submitted bytes. An
 * address the vendor did not answer is `unknown`, never absent. Two submissions that differ only in case or white
 * space are two entries, each with the verdict of their shared normalized address. `checkVerificationVerdicts`
 * states this as a check a runtime applies to its adapter's output.
 *
 * Metered: both arms say what the call cost. The vendor's own status, raw payload, job handle and timeout stay
 * inside the adapter.
 */
export interface VerificationProviderPort {
  verify(emails: readonly string[]): Promise<
    MeteredPortResult<{
      readonly verdicts: readonly EmailVerificationVerdict[];
    }>
  >;
}

/** What an adapter's verdicts lack or add, against the addresses submitted. `holds` iff every list is empty. */
export interface VerdictTotality {
  readonly holds: boolean;
  /** Distinct submitted addresses with no verdict. */
  readonly missing: readonly string[];
  /** Verdicts for an address that was not submitted. */
  readonly extra: readonly string[];
  /** Submitted addresses with more than one verdict. */
  readonly duplicated: readonly string[];
  /** Addresses whose verdict is not one of the five statuses. */
  readonly invalidStatus: readonly string[];
  /**
   * Normalized addresses (trimmed and lowercased) whose submitted variants carry different verdicts. Variants equal
   * after trim and lowercase share one verdict, so a disagreement is an adapter defect.
   */
  readonly disagreeing: readonly string[];
}

const STATUSES: readonly string[] = [
  'valid',
  'invalid',
  'catch_all',
  'risky',
  'unknown',
];

/** Checks an adapter's verdicts against the submitted addresses, byte for byte. Pure; never throws. */
export function checkVerificationVerdicts(
  submitted: readonly string[],
  verdicts: readonly EmailVerificationVerdict[],
): VerdictTotality {
  const wanted = new Set(submitted);
  const seen = new Map<string, number>();
  const invalidStatus: string[] = [];
  for (const verdict of verdicts) {
    seen.set(verdict.email, (seen.get(verdict.email) ?? 0) + 1);
    if (!STATUSES.includes(verdict.status as string))
      invalidStatus.push(verdict.email);
  }
  const byNormalized = new Map<string, Set<string>>();
  for (const verdict of verdicts) {
    if (!wanted.has(verdict.email)) continue;
    const normalized = verdict.email.trim().toLowerCase();
    const statuses = byNormalized.get(normalized) ?? new Set<string>();
    statuses.add(verdict.status);
    byNormalized.set(normalized, statuses);
  }
  const disagreeing = [...byNormalized]
    .filter(([, statuses]) => statuses.size > 1)
    .map(([normalized]) => normalized);
  const missing = [...wanted].filter((email) => !seen.has(email));
  const extra = [...seen.keys()].filter((email) => !wanted.has(email));
  const duplicated = [...seen]
    .filter(([email, count]) => wanted.has(email) && count > 1)
    .map(([email]) => email);
  return {
    holds:
      missing.length === 0 &&
      extra.length === 0 &&
      duplicated.length === 0 &&
      invalidStatus.length === 0 &&
      disagreeing.length === 0,
    missing: missing.sort(),
    extra: extra.sort(),
    duplicated: duplicated.sort(),
    invalidStatus: [...new Set(invalidStatus)].sort(),
    disagreeing: disagreeing.sort(),
  };
}

/**
 * The verdict for one email-account-key, DERIVED from the observed verdicts of the addresses that share it (Enrich,
 * 2026-11-14). The key collapses case, white space and a plus tag, so `ada+n@x.test` and `ada@x.test` are two vendor
 * lookups under one key, and they can legitimately disagree. The key takes their common verdict when all agree, and
 * `unknown` when any two disagree, or when there is none, or when one is outside the five statuses. It fails closed,
 * does not depend on order, and never promotes one mailbox's answer to another.
 *
 * The per-address verdicts stay the observed facts. The key verdict is derived from them, never a vendor's answer,
 * so a reader can always go back to the addresses. The caller groups by its own email-account-key implementation, held
 * to `core.email-account-key`'s vectors. Pure; never throws.
 */
export function verdictForKey(
  statuses: readonly VerificationStatus[],
): VerificationStatus {
  const first = statuses[0];
  if (first === undefined || !STATUSES.includes(first as string))
    return 'unknown';
  return statuses.every((status) => status === first) ? first : 'unknown';
}
