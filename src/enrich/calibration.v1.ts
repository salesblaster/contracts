import { z } from 'zod/v4';
import { fieldGrammar } from '../core/index.js';
import type { Grade, LeadScored } from './lead-scored.v1.js';

/**
 * `GraderCalibration`, the ratified bar table for one grader configuration, and the calibration predicate over it. The
 * Enrich context owns the shape and the semantics. A consumer that decides on a score calls the predicate rather than
 * re-implementing it, so every runtime decides the same way.
 *
 * Bars are ratified per grader configuration and never carry over to another configuration; a value with no ratified
 * bar is never rendered, and a confidence clears a bar at or above it.
 */

/** Where the grades were produced: by a development grader, or by the production one. */
export type GraderRuntime = 'development' | 'production';

/**
 * The eight-part key: which grader produced the grades. A calibration binds only the configuration it was audited
 * under, its runtime included.
 */
export interface GraderConfiguration {
  readonly enrichmentType: { readonly id: string; readonly version: number };
  readonly rubric: { readonly id: string; readonly version: string };
  readonly model: string;
  readonly prompt: {
    readonly name: string;
    readonly version: string;
    readonly contentHash: string;
  };
  readonly runtime: GraderRuntime;
}

/**
 * The part of a `lead.scored.v1` that `graderConfigurationOf` reads: its `typeRef`, `rubricRef` and `grader`, read from
 * the score fact's own type. Of the grader, the model, prompt and runtime are configuration; `gradeSchema` is provenance
 * only.
 */
export type ScoreProvenance = Pick<
  LeadScored,
  'typeRef' | 'rubricRef' | 'grader'
>;

/** A score's grader configuration, read from the score itself: its `typeRef`, `rubricRef` and `grader`. */
export function graderConfigurationOf(
  score: ScoreProvenance,
): GraderConfiguration {
  return {
    enrichmentType: { id: score.typeRef.id, version: score.typeRef.version },
    rubric: { id: score.rubricRef.id, version: score.rubricRef.version },
    model: score.grader.model,
    prompt: {
      name: score.grader.prompt.name,
      version: score.grader.prompt.version,
      contentHash: score.grader.prompt.contentHash,
    },
    runtime: score.grader.runtime,
  };
}

/** One calibrated criterion's minimum confidence. A threshold is a bar value: it travels only inside SalesBlaster. */
export interface Bar {
  readonly criterionId: string;
  /** A decimal string of scale 2 (`"0.70"`), compared exactly against a scale-4 confidence. */
  readonly threshold: string;
}

/** Enrich's calibration record: the bars for one grader configuration at one revision, ratified once. */
export interface GraderCalibration {
  /** `1`: the record travels without an envelope, through a port. */
  readonly schemaVersion: 1;
  readonly graderConfiguration: GraderConfiguration;
  /** Starts at 1 and rises by one per configuration, one signing each. */
  readonly revision: number;
  /** May be empty: an empty calibration calibrates nothing. Each criterion is barred at most once. */
  readonly bars: readonly Bar[];
  /** The ratifier, as an opaque operator reference, never a name or an address (`pseudonymous`). */
  readonly ratifiedBy: string;
  readonly ratifiedAt: string;
  /** The signed audit the bars came from. */
  readonly auditRef: string;
}

/**
 * One criterion's grade, as far as the predicate reads it: the part of a published `Grade` it needs, so a score's
 * `grades`, or an inferred input's, pass to `checkCalibration` as they are. `confidence` is present on every engine
 * grade and absent on an operator grade; an engine grade that lacks one never clears a bar, so the predicate stays
 * total over an input that breaks the rule.
 */
export type CalibrationGrade = Pick<
  Grade,
  'criterionId' | 'evidencedBy' | 'accepted' | 'confidence'
>;

/** The part of a score the predicate reads. `graderConfiguration` is the score's `typeRef`, `rubricRef` and `grader`. */
export interface CalibrationInput {
  readonly outcome: 'scored' | 'disqualified';
  readonly graderConfiguration: GraderConfiguration;
  readonly grades: readonly CalibrationGrade[];
}

export type CalibrationReason =
  | 'calibrated'
  | 'no_calibration'
  | 'not_ratified'
  | 'not_production'
  | 'configuration_mismatch'
  | 'not_scored'
  | 'no_accepted_engine_grade'
  | 'unbarred_criterion'
  | 'below_bar';

export interface CalibrationVerdict {
  readonly holds: boolean;
  readonly reason: CalibrationReason;
  /** The criteria an `unbarred_criterion` or `below_bar` refusal is about, sorted. Empty otherwise. */
  readonly criterionIds: readonly string[];
}

/** Compares two grammar decimals exactly, by digits across scales, never through binary floats. */
export function compareDecimal(a: string, b: string): -1 | 0 | 1 {
  const parse = (s: string) => {
    const m = /^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(s);
    if (!m) throw new RangeError(`not a decimal string: ${s}`);
    return { negative: m[1] === '-', whole: m[2], fraction: m[3] ?? '' };
  };
  const x = parse(a);
  const y = parse(b);
  const width = Math.max(x.fraction.length, y.fraction.length);
  const digits = (d: typeof x) =>
    d.whole.padStart(32, '0') + d.fraction.padEnd(width, '0');
  const zero = (d: typeof x) => /^0+$/.test(d.whole + d.fraction);
  const sx = zero(x) ? 0 : x.negative ? -1 : 1;
  const sy = zero(y) ? 0 : y.negative ? -1 : 1;
  if (sx !== sy) return sx < sy ? -1 : 1;
  if (sx === 0) return 0;
  const cmp = digits(x) < digits(y) ? -1 : digits(x) > digits(y) ? 1 : 0;
  return (sx < 0 ? -cmp : cmp) as -1 | 0 | 1;
}

const sameConfiguration = (a: GraderConfiguration, b: GraderConfiguration) =>
  a.enrichmentType.id === b.enrichmentType.id &&
  a.enrichmentType.version === b.enrichmentType.version &&
  a.rubric.id === b.rubric.id &&
  a.rubric.version === b.rubric.version &&
  a.model === b.model &&
  a.prompt.name === b.prompt.name &&
  a.prompt.version === b.prompt.version &&
  a.prompt.contentHash === b.prompt.contentHash &&
  a.runtime === b.runtime;

/** A ratification field is lacking when absent or empty (a present string is never `""`). */
const lacking = (v: unknown) => typeof v !== 'string' || v.length === 0;

/**
 * The calibration predicate. It refuses in this order and holds otherwise: no calibration; not
 * ratified; a development calibration (`not_production`); a configuration that differs in any of its eight parts, the
 * runtime included; an outcome other than `scored`; no accepted engine
 * grade (never vacuously true); an accepted engine grade whose criterion has no bar; an accepted engine grade whose
 * confidence is absent or below its bar. Operator grades and grades code did not accept are not read. The tenant is
 * not checked here: the record arrives through a tenant-scoped port. Pure.
 */
export function checkCalibration(
  score: CalibrationInput,
  calibration: GraderCalibration | undefined,
): CalibrationVerdict {
  const verdict = (
    reason: CalibrationReason,
    ids: readonly string[] = [],
  ): CalibrationVerdict => ({
    holds: reason === 'calibrated',
    reason,
    criterionIds: [...ids].sort(),
  });
  if (!calibration) return verdict('no_calibration');
  if (
    lacking(calibration.ratifiedBy) ||
    lacking(calibration.ratifiedAt) ||
    lacking(calibration.auditRef)
  ) {
    return verdict('not_ratified');
  }
  // Development bars authorize no automatic disposition, even for that configuration's own scores.
  if (calibration.graderConfiguration.runtime !== 'production') {
    return verdict('not_production');
  }
  if (
    !sameConfiguration(
      score.graderConfiguration,
      calibration.graderConfiguration,
    )
  ) {
    return verdict('configuration_mismatch');
  }
  if (score.outcome !== 'scored') return verdict('not_scored');
  const engine = score.grades.filter(
    (g) => g.evidencedBy === 'engine' && g.accepted,
  );
  if (engine.length === 0) return verdict('no_accepted_engine_grade');
  // A criterion named twice is a producer's error; the stricter bar is read, so the error can only refuse.
  const bars = new Map<string, string>();
  for (const b of calibration.bars) {
    const seen = bars.get(b.criterionId);
    bars.set(
      b.criterionId,
      seen !== undefined && compareDecimal(seen, b.threshold) > 0
        ? seen
        : b.threshold,
    );
  }
  const unbarred = engine
    .filter((g) => !bars.has(g.criterionId))
    .map((g) => g.criterionId);
  if (unbarred.length > 0) return verdict('unbarred_criterion', unbarred);
  const below = engine
    .filter((g) => {
      const confidence = (g as { confidence?: unknown }).confidence;
      return (
        typeof confidence !== 'string' ||
        compareDecimal(confidence, bars.get(g.criterionId) as string) < 0
      );
    })
    .map((g) => g.criterionId);
  if (below.length > 0) return verdict('below_bar', below);
  return verdict('calibrated');
}

/** `checkCalibration(...).holds`. */
export function isCalibrated(
  score: CalibrationInput,
  calibration: GraderCalibration | undefined,
): boolean {
  return checkCalibration(score, calibration).holds;
}

const reference = () =>
  z
    .object({ id: fieldGrammar.string(), version: fieldGrammar.string() })
    .strict();

/**
 * An enrichment type's reference: its version is an integer, bumped when the output schema or the compute policy
 * changes semantics. A rubric's version stays a string.
 */
const typeReference = () =>
  z
    .object({ id: fieldGrammar.string(), version: fieldGrammar.integer() })
    .strict();

/**
 * The eight-part key as a schema, closed at every level: the calibration record's `graderConfiguration`, and the
 * configuration a score's inferred input was graded under. Its `enrichmentType` and `rubric` are the score's
 * `typeRef` and `rubricRef`.
 */
export const graderConfigurationSchema = z
  .object({
    enrichmentType: typeReference(),
    rubric: reference(),
    model: fieldGrammar.string(),
    prompt: z
      .object({
        name: fieldGrammar.string(),
        version: fieldGrammar.string(),
        contentHash: fieldGrammar.string(),
      })
      .strict(),
    runtime: z.enum(['development', 'production']),
  })
  .strict();

/**
 * `GraderCalibration`, closed at every level, in the grammar's types only. What the grammar cannot state (each
 * criterion at most once, a threshold within 0.00 to 1.00, `revision` from 1) is a producer invariant.
 */
export const graderCalibrationSchema = z
  .object({
    schemaVersion: z.literal(1),
    graderConfiguration: graderConfigurationSchema,
    revision: fieldGrammar.integer(),
    bars: z.array(
      z
        .object({
          criterionId: fieldGrammar.string(),
          threshold: fieldGrammar.decimal(2),
        })
        .strict(),
    ),
    ratifiedBy: fieldGrammar.string(),
    ratifiedAt: fieldGrammar.timestamp(),
    auditRef: fieldGrammar.string(),
  })
  .strict();
