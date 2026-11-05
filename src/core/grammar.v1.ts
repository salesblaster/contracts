import { z } from 'zod/v4';

/**
 * The field grammar's core types as Zod constructs (ADR-OCP-007 §8.4), version 1.
 *
 * OCP owns the grammar (ADR-OCP-007 §8.1); these builders restate its patterns because `ocp-core` 0.8.0 holds them
 * internally and exports none. When `ocp-core` exports them, this file re-exports them instead and keeps its names.
 * `grammar.v1.spec.ts` pins every pattern to the ADR's own text and test vectors.
 *
 * The construct allow-list is exactly ADR-OCP-007 §8.4's table: no `z.date()`, `z.bigint()`, transform, refine,
 * preprocess, default or bare `format` in anything published.
 */

/** RFC 3339 full-date. */
export const DATE_PATTERN = '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

/** RFC 3339 in UTC with milliseconds and `Z`: one written form per instant. */
export const TIMESTAMP_PATTERN =
  '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$';

/** `DECIMAL_s` for a scale `s` of at least 1. */
export function decimalPattern(scale: number): string {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new RangeError(
      `decimal scale must be an integer of at least 1, got ${scale}`,
    );
  }
  return `^-?(0|[1-9][0-9]*)\\.[0-9]{${scale}}$`;
}

export const SAFE_INTEGER_MIN = -9007199254740991;
export const SAFE_INTEGER_MAX = 9007199254740991;

/** The closed core (ADR-OCP-007 §8.4), one builder per type. */
export const fieldGrammar = {
  string: () => z.string(),
  integer: () => z.number().int().min(SAFE_INTEGER_MIN).max(SAFE_INTEGER_MAX),
  decimal: (scale: number) =>
    z.string().regex(new RegExp(decimalPattern(scale))),
  boolean: () => z.boolean(),
  date: () => z.string().regex(new RegExp(DATE_PATTERN)),
  timestamp: () => z.string().regex(new RegExp(TIMESTAMP_PATTERN)),
} as const;
