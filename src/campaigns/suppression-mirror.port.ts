import type { PortResult } from '../core/index.js';

/** One submitted address and whether it reads back as blocked in the bound scope's blocklist. */
export interface BlocklistEntry {
  /** The address exactly as submitted. */
  readonly email: string;
  readonly blocked: boolean;
}

/**
 * Project suppressions into a sequencer's blocklist, and read them back. Campaigns owns the suppression register.
 * This port only mirrors it, and a suppression's cause stays in the register, not at the sequencer.
 */
export interface ExternalSuppressionMirrorPort {
  mirror(command: {
    readonly emails: readonly string[];
    readonly domains: readonly string[];
  }): Promise<
    PortResult<{ readonly emailsAdded: number; readonly domainsAdded: number }>
  >;
  /**
   * One entry per distinct submitted address, echoing its spelling byte for byte. `blocked` is read back from the
   * bound scope's blocklist. `checkBlocklistEntries` states this as a check.
   */
  checkEmails(command: {
    readonly emails: readonly string[];
  }): Promise<PortResult<{ readonly results: readonly BlocklistEntry[] }>>;
  listDomains(): Promise<PortResult<{ readonly domains: readonly string[] }>>;
}

/** What a blocklist read lacks or adds, against the addresses submitted. `holds` iff every list is empty. */
export interface BlocklistTotality {
  readonly holds: boolean;
  readonly missing: readonly string[];
  readonly extra: readonly string[];
  readonly duplicated: readonly string[];
}

/** Checks a `checkEmails` answer against the submitted addresses, byte for byte. Pure; never throws. */
export function checkBlocklistEntries(
  submitted: readonly string[],
  entries: readonly BlocklistEntry[],
): BlocklistTotality {
  const wanted = new Set(submitted);
  const seen = new Map<string, number>();
  for (const entry of entries)
    seen.set(entry.email, (seen.get(entry.email) ?? 0) + 1);
  const missing = [...wanted].filter((email) => !seen.has(email)).sort();
  const extra = [...seen.keys()].filter((email) => !wanted.has(email)).sort();
  const duplicated = [...seen]
    .filter(([email, count]) => wanted.has(email) && count > 1)
    .map(([email]) => email)
    .sort();
  return {
    holds:
      missing.length === 0 && extra.length === 0 && duplicated.length === 0,
    missing,
    extra,
    duplicated,
  };
}
