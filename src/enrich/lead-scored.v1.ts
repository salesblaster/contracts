import { z } from 'zod/v4';
import { fieldGrammar } from '../core/index.js';
import {
  graderConfigurationSchema,
  type GraderConfiguration,
  type GraderRuntime,
} from './calibration.v1.js';

/** A score's two outcomes. A failed attempt publishes nothing. */
export type ScoreOutcome = 'scored' | 'disqualified';

/** One graded criterion, in the rubric's declared order. */
export interface Grade {
  readonly criterionId: string;
  /** Within the rubric's grade scale, 0 to the grade maximum. */
  readonly grade: number;
  /**
   * A decimal string of scale 4, within `"0.0000"` to `"1.0000"`: present on every engine grade, absent on an
   * operator grade.
   */
  readonly confidence?: string;
  /** Whether code accepted the grade into the composite. The composite is computed from exactly the accepted grades. */
  readonly accepted: boolean;
  /** `operator` for a criterion an operator evidenced; its grade carries no `confidence`. */
  readonly evidencedBy: 'engine' | 'operator';
  /** Ids of stored evidence, never its text. Empty means the criterion was graded without evidence. */
  readonly evidenceRefs: readonly string[];
}

/** An inferred field a disqualifier read, with that field's own immutable result, copied unchanged. */
export interface InferredInput {
  readonly field: string;
  readonly resultId: string;
  readonly graderConfiguration: GraderConfiguration;
  readonly grades: readonly Grade[];
}

/** Why a lead was disqualified. */
export interface Disqualifier {
  readonly id: string;
  readonly reason: string;
  /** The disqualifier's declared evaluator, from the pinned rubric: who may evaluate it, not who did. */
  readonly evaluatedBy: 'engine' | 'operator' | 'either';
  /** Exactly the inferred fields the disqualifier read; empty when it read only provided or observed fields. */
  readonly inferredInputs: readonly InferredInput[];
}

/**
 * The payload of `lead.scored.v1`: what happened when a lead was scored, and nothing that can change later. It never
 * carries a criterion's weight or anchor, prompt text, a bar or a threshold, or a calibration verdict: a consumer that
 * decides on a score applies `checkCalibration` to its grades and grader configuration against the bar table current
 * at decision time. `composite` and `ceiling` are evidence for a human reviewer; approval keys on `outcome`, `band`
 * and `pendingOperatorReview`. The rules the grammar cannot state are in `conformance/enrich/lead-scored.v1.json`.
 *
 * One flat type, mirroring the wire: the record is discriminated by `outcome`, and which conditional fields are present
 * (`band`, `disqualifier`, `operatorCompletion`) is a producer invariant the vectors check, as the published grammar
 * has no conditional field.
 */
export interface LeadScored {
  /** Required in the payload: the tenant whose lead this is. */
  readonly tenantId: string;
  /** The subject, by natural or opaque keys only: as `Lead`'s fields of the same names. */
  readonly lead: {
    readonly globalContactId: string;
    readonly emailAccountKey: string;
    readonly companyDomain?: string;
  };
  readonly outcome: ScoreOutcome;
  /** The band's stable id, one of `RubricBands.bands` for this `rubricRef`: present when scored, absent when not. */
  readonly band?: string;
  /**
   * The code-computed score, a decimal string of scale 4: the accepted grades' contributions summed in double precision
   * in the rubric's declared order, then rounded once, half-to-even, on the double's exact binary value. The band
   * compares this rounded value. `"0.0000"` when disqualified.
   */
  readonly composite: string;
  /** The scale: the grade maximum times the criterion count. At least 0. */
  readonly ceiling: number;
  /** Present when disqualified, absent when scored. */
  readonly disqualifier?: Disqualifier;
  /** Operator-evaluated items beside a scored record; empty arrays when none. */
  readonly pendingOperatorReview: {
    readonly disqualifierIds: readonly string[];
    readonly criterionIds: readonly string[];
  };
  /** Who produced this composite. An engine score and a completed score are two facts, each with its own `resultId`. */
  readonly scoredBy: 'engine' | 'operator_completed';
  /**
   * The operator's act, present exactly when `scoredBy` is `operator_completed`: `causedBy` is the command or unit id
   * that wrote the new attempt, never a person's name or address.
   */
  readonly operatorCompletion?: {
    readonly causedBy: string;
    readonly completedAt: string;
  };
  /** Each graded criterion once, in the rubric's declared order; one pending an operator is not here. */
  readonly grades: readonly Grade[];
  /**
   * The grader's provenance: the model, the prompt by name, version and content hash (so its text never crosses), the
   * runtime, and the grade output schema as `name@version`. With `typeRef` and `rubricRef`, its model, prompt and
   * runtime are the whole grader configuration (`graderConfigurationOf`); `gradeSchema` is provenance only.
   */
  readonly grader: {
    readonly model: string;
    readonly prompt: {
      readonly name: string;
      readonly version: string;
      readonly contentHash: string;
    };
    readonly runtime: GraderRuntime;
    readonly gradeSchema: string;
  };
  /** The rubric Enrich owns, by id and version. */
  readonly rubricRef: { readonly id: string; readonly version: string };
  /**
   * The enrichment type: its version is an integer, bumped when the output schema or the compute policy changes
   * meaning, never by a rubric change.
   */
  readonly typeRef: { readonly id: string; readonly version: number };
  /** The enrich result this reports, its attempt included, for read-back and for a decision to name. */
  readonly resultId: string;
  /** The time the composite was computed as of; decay reads it, and a replay pins it. */
  readonly asOf: string;
  /** When this composite was computed. */
  readonly computedAt: string;
}

const gradeSchema = z
  .object({
    criterionId: fieldGrammar.string(),
    grade: fieldGrammar.integer(),
    confidence: fieldGrammar.decimal(4).optional(),
    accepted: fieldGrammar.boolean(),
    evidencedBy: z.enum(['engine', 'operator']),
    evidenceRefs: z.array(fieldGrammar.string()),
  })
  .strict();

/** `lead.scored.v1`'s payload, closed at every level, in the grammar's types only. */
export const leadScoredSchema = z
  .object({
    tenantId: fieldGrammar.string(),
    lead: z
      .object({
        globalContactId: fieldGrammar.string(),
        emailAccountKey: fieldGrammar.string(),
        companyDomain: fieldGrammar.string().optional(),
      })
      .strict(),
    outcome: z.enum(['scored', 'disqualified']),
    band: fieldGrammar.string().optional(),
    composite: fieldGrammar.decimal(4),
    ceiling: fieldGrammar.integer(),
    disqualifier: z
      .object({
        id: fieldGrammar.string(),
        reason: fieldGrammar.string(),
        evaluatedBy: z.enum(['engine', 'operator', 'either']),
        inferredInputs: z.array(
          z
            .object({
              field: fieldGrammar.string(),
              resultId: fieldGrammar.string(),
              graderConfiguration: graderConfigurationSchema,
              grades: z.array(gradeSchema),
            })
            .strict(),
        ),
      })
      .strict()
      .optional(),
    pendingOperatorReview: z
      .object({
        disqualifierIds: z.array(fieldGrammar.string()),
        criterionIds: z.array(fieldGrammar.string()),
      })
      .strict(),
    scoredBy: z.enum(['engine', 'operator_completed']),
    operatorCompletion: z
      .object({
        causedBy: fieldGrammar.string(),
        completedAt: fieldGrammar.timestamp(),
      })
      .strict()
      .optional(),
    grades: z.array(gradeSchema),
    grader: z
      .object({
        model: fieldGrammar.string(),
        prompt: graderConfigurationSchema.shape.prompt,
        runtime: graderConfigurationSchema.shape.runtime,
        gradeSchema: fieldGrammar.string(),
      })
      .strict(),
    rubricRef: graderConfigurationSchema.shape.rubric,
    typeRef: graderConfigurationSchema.shape.enrichmentType,
    resultId: fieldGrammar.string(),
    asOf: fieldGrammar.timestamp(),
    computedAt: fieldGrammar.timestamp(),
  })
  .strict();
