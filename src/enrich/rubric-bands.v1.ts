import { z } from 'zod/v4';
import { fieldGrammar } from '../core/index.js';
import { graderConfigurationSchema } from './calibration.v1.js';

/**
 * `RubricBands`: the labels a rubric version declares, as a campaign's policy reads them. A read model, not an event;
 * Enrich owns it and fulfils the port a campaign reads it through. It carries labels only, never a threshold, a weight
 * or an anchor, so where the threshold table lives does not change it. The rules the grammar cannot state (`bands`
 * non-empty, its ids unique and never `""`) are in `conformance/enrich/rubric-bands.v1.json`.
 */
export interface RubricBands {
  /** `1`: the record travels without an envelope, through a port. */
  readonly schemaVersion: 1;
  /** The rubric version these labels belong to: the same value a `lead.scored.v1` carries as `rubricRef`. */
  readonly rubricRef: { readonly id: string; readonly version: string };
  /**
   * The bands' stable ids (`pursue`, not its display label), in the rubric's declared order: the first threshold
   * cleared wins. A label is opaque to a campaign, and is never the score's outcome: a band may be called
   * `disqualify` while the outcome `disqualified` is read from `outcome` alone.
   */
  readonly bands: readonly string[];
}

/** `RubricBands`, closed at every level. */
export const rubricBandsSchema = z
  .object({
    schemaVersion: z.literal(1),
    rubricRef: graderConfigurationSchema.shape.rubric,
    bands: z.array(fieldGrammar.string()),
  })
  .strict();
