import type { PortResult } from '../core/index.js';

/**
 * The sequencer ports, as SalesBlaster's Campaigns context splits them. Campaigns owns their meaning. Each runtime
 * binds one adapter per tenant and sequencer workspace at its composition root, so no tenant, provider or workspace
 * appears here. A sequencer campaign is an opaque `campaignRef` that only the bound adapter resolves; it is never a
 * domain key and never parsed by a caller.
 */

/** A lead as a sequencer receives it: Enrich's `Lead` fields, plus template variables. */
export interface SequencerLead {
  readonly globalContactId: string;
  readonly emailAccountKey: string;
  readonly email: string;
  /** Optional fields: absent means the same as a native `null`. */
  readonly firstName?: string;
  readonly lastName?: string;
  readonly title?: string;
  readonly phone?: string;
  readonly companyName?: string;
  readonly companyDomain?: string;
  readonly linkedinUrl?: string;
  /**
   * Copy variables by name, as the text the sequencer receives. A runtime reduces its own values the way SalesBlaster's
   * adapters do: a string as it is, anything else JSON-stringified, and null or undefined dropped.
   */
  readonly variables?: Readonly<Record<string, string>>;
}

/**
 * What the target campaign holds for one lead after an upload, read back from the sequencer:
 * - `accepted`: sent by this upload, and read back enrolled;
 * - `already_present`: the campaign held it before this upload, so it was not sent;
 * - `invalid`: refused before sending, such as a malformed address;
 * - `rejected`: sent, not enrolled, and explained by evidence in `reason`.
 */
export type SequencerLeadOutcome =
  | 'accepted'
  | 'already_present'
  | 'invalid'
  | 'rejected';

export interface SequencerLeadUploadCommand {
  readonly campaignRef: string;
  readonly leads: readonly SequencerLead[];
  /** Skip a lead the bound workspace already holds: a dedup intention. An adapter that cannot honour it refuses. */
  readonly skipIfInWorkspace?: boolean;
  /** Skip a lead the sequencer holds in another of its campaigns. An adapter that cannot honour it refuses. */
  readonly skipIfInOtherCampaign?: boolean;
  readonly dryRun?: boolean;
}

export interface SequencerLeadResult {
  /** The lead's `globalContactId` as sent: the key of this result. */
  readonly globalContactId: string;
  readonly outcome: SequencerLeadOutcome;
  /** Present for `invalid` and `rejected`; evidence, never inference. */
  readonly reason?: string;
}

/**
 * Upload leads to a sequencer campaign. The read-back outcome is the completion observer, so the caller passes no
 * idempotency key: re-sending the same leads yields `already_present`, never a duplicate.
 * - Exactly one result per submitted lead, keyed by `globalContactId`.
 * - `already_present` is read from the target campaign, never from the caller's memory.
 * - A skip the adapter applies is explained by prior state it read; an adapter that cannot read it refuses.
 * - A dry run returns empty `results`, so no enrollment is ever written from a dry run.
 * `checkSequencerUploadResults` states the first and last rules as a check a runtime applies to its adapter's output.
 */
export interface ExternalSequencerLeadUploadPort {
  upload(
    command: SequencerLeadUploadCommand,
  ): Promise<PortResult<{ readonly results: readonly SequencerLeadResult[] }>>;
}

/**
 * - `sending`: the campaign was started, or was already sending (an idempotent re-assert);
 * - `not_found`: the sequencer has no such campaign;
 * - `not_startable`: the campaign exists in a state it cannot start from.
 * `not_found` and `not_startable` are domain answers: a reconciling caller fails closed on them and never retries them
 * as transport. `PortError` `request_failed` is for transport and API failure only.
 */
export type SequencerLaunchOutcome = 'sending' | 'not_found' | 'not_startable';

export interface SequencerLaunchPort {
  /** Start, or idempotently re-assert, sending for the campaign. */
  launch(target: { readonly campaignRef: string }): Promise<
    PortResult<{
      readonly outcome: SequencerLaunchOutcome;
      readonly reason?: string;
    }>
  >;
}

/**
 * - `moved`: this call moved the contact;
 * - `already_in_target`: the contact was already in the target, by the sequencer's own rule or an earlier call;
 * - `not_in_source`: the contact is not in the source campaign, so there is nothing to move;
 * - `rejected`: the sequencer refuses this pairing, such as a target that is not a child of the source.
 */
export type CampaignTransitionOutcome =
  | 'moved'
  | 'already_in_target'
  | 'not_in_source'
  | 'rejected';

export interface ExternalCampaignTransitionPort {
  /**
   * Move a contact from one campaign graph to any other. A parent/child constraint is an adapter precondition,
   * enforced where the sequencer has it, never part of the port.
   */
  transition(command: {
    readonly fromCampaignRef: string;
    readonly toCampaignRef: string;
    readonly contactEmail: string;
    readonly dryRun?: boolean;
  }): Promise<
    PortResult<{
      readonly outcome: CampaignTransitionOutcome;
      readonly reason?: string;
    }>
  >;
}

/** What an upload's results lack or add, against its command. `holds` iff every list is empty and `dryRun` is clean. */
export interface UploadResultTotality {
  readonly holds: boolean;
  /** Submitted leads with no result. */
  readonly missing: readonly string[];
  /** Results for a lead that was not submitted. */
  readonly extra: readonly string[];
  /** Leads with more than one result. */
  readonly duplicated: readonly string[];
  /** Leads whose outcome is not one of the four, or whose `invalid`/`rejected` outcome has no reason. */
  readonly malformed: readonly string[];
  /** True when a dry run returned results: none may be written. */
  readonly dryRunReturnedResults: boolean;
}

const OUTCOMES: readonly string[] = [
  'accepted',
  'already_present',
  'invalid',
  'rejected',
];

/** Checks an adapter's upload results against the command. Pure; never throws. */
export function checkSequencerUploadResults(
  command: Pick<SequencerLeadUploadCommand, 'leads' | 'dryRun'>,
  results: readonly SequencerLeadResult[],
): UploadResultTotality {
  if (command.dryRun === true) {
    return {
      holds: results.length === 0,
      missing: [],
      extra: [],
      duplicated: [],
      malformed: [],
      dryRunReturnedResults: results.length > 0,
    };
  }
  const wanted = new Set(command.leads.map((lead) => lead.globalContactId));
  const seen = new Map<string, number>();
  const malformed = new Set<string>();
  for (const result of results) {
    const id = result.globalContactId;
    seen.set(id, (seen.get(id) ?? 0) + 1);
    const explained =
      (result.outcome !== 'invalid' && result.outcome !== 'rejected') ||
      (typeof result.reason === 'string' && result.reason.length > 0);
    if (!OUTCOMES.includes(result.outcome as string) || !explained)
      malformed.add(id);
  }
  const missing = [...wanted].filter((id) => !seen.has(id)).sort();
  const extra = [...seen.keys()].filter((id) => !wanted.has(id)).sort();
  const duplicated = [...seen]
    .filter(([id, count]) => wanted.has(id) && count > 1)
    .map(([id]) => id)
    .sort();
  return {
    holds:
      missing.length === 0 &&
      extra.length === 0 &&
      duplicated.length === 0 &&
      malformed.size === 0,
    missing,
    extra,
    duplicated,
    malformed: [...malformed].sort(),
    dryRunReturnedResults: false,
  };
}
