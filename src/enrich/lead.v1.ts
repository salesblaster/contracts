import { z } from 'zod/v4';
import { fieldGrammar } from '../core/index.js';

/**
 * `Lead`, the one lead shape: who a lead is, as Enrich hands it on. Every field is a string, and a value the source
 * does not hold is absent: never `null`, never `""`. The rules the grammar cannot state (no empty string, an at sign
 * in `email`, the key equal to `core.email-account-key` of `email`) are in `conformance/enrich/lead.v1.json`.
 */
export interface Lead {
  /**
   * The producing runtime's own opaque contact id (`pseudonymous`). It stays the contact's key and is never changed,
   * and it is never returned or emitted as a person's identifier: a person is a separate fact, with one of four
   * outcomes (one person, split, none, unknown). A holder that needs the person resolves this id through the published
   * lineage map, never by re-deriving it from the email. A person, when carried, travels in its own field beside this
   * one; a delivered file's column of the same name is not this field. It is not compared across runtimes.
   */
  readonly globalContactId: string;
  /** The normalized contact point a verdict is about (`direct`): `core.email-account-key` of `email`. */
  readonly emailAccountKey: string;
  /** The address as sourced (`direct`); it contains an at sign. */
  readonly email: string;
  /** `direct`. */
  readonly firstName?: string;
  /** `direct`. */
  readonly lastName?: string;
  /** `direct`: a free-text title at a named company often singles one person out. */
  readonly title?: string;
  /** `direct`. */
  readonly phone?: string;
  /** `none`. */
  readonly companyName?: string;
  /** `none`. */
  readonly companyDomain?: string;
  /** `direct`. */
  readonly linkedinUrl?: string;
}

/** The canonical five email verdicts. */
export type VerificationStatus =
  | 'valid'
  | 'invalid'
  | 'catch_all'
  | 'risky'
  | 'unknown';

/**
 * A lead with its email verdict: what Enrich hands Campaigns for projection and upload. Campaigns applies its own
 * eligibility policy to `verification.status`; Enrich never filters by eligibility here, and the stage and the
 * vendor's own status that produced the verdict stay inside Enrich.
 */
export interface VerifiedLead extends Lead {
  readonly verification: {
    readonly status: VerificationStatus;
    /** When the verdict was observed. */
    readonly verifiedAt: string;
  };
}

const leadFields = {
  globalContactId: fieldGrammar.string(),
  emailAccountKey: fieldGrammar.string(),
  email: fieldGrammar.string(),
  firstName: fieldGrammar.string().optional(),
  lastName: fieldGrammar.string().optional(),
  title: fieldGrammar.string().optional(),
  phone: fieldGrammar.string().optional(),
  companyName: fieldGrammar.string().optional(),
  companyDomain: fieldGrammar.string().optional(),
  linkedinUrl: fieldGrammar.string().optional(),
};

/** `Lead`, closed, in the grammar's types only. */
export const leadSchema = z.object(leadFields).strict();

/** `VerifiedLead`, closed at every level. */
export const verifiedLeadSchema = z
  .object({
    ...leadFields,
    verification: z
      .object({
        status: z.enum(['valid', 'invalid', 'catch_all', 'risky', 'unknown']),
        verifiedAt: fieldGrammar.timestamp(),
      })
      .strict(),
  })
  .strict();
