import { z } from 'zod/v4';

/**
 * Record identity and pointers (ADR-OCP-007 §7), version 1.
 *
 * OCP owns these grammars; `ocp-core` 0.8.0 holds them in `records.js` and exports none, so they are restated here
 * and pinned to the ADR's test vectors in `ids.v1.spec.ts`. The derivation (HMAC over a JCS basis) is not here: the
 * contracts carry shapes, never an implementation.
 */

/** A record type key, a child kind or a provider key. */
export const TYPE_KEY_PATTERN = '^[a-z][a-z0-9_]{0,62}$';

/** A record id, a child's included: `k<generation>_<32 lowercase hex>`. */
export const RECORD_ID_PATTERN = '^k(0|[1-9][0-9]*)_[0-9a-f]{32}$';

/** `record:<type>/<id>`, with an optional `#<child kind>/<id>`. */
export const RECORD_POINTER_PATTERN =
  '^record:[a-z][a-z0-9_]{0,62}/k(0|[1-9][0-9]*)_[0-9a-f]{32}(#[a-z][a-z0-9_]{0,62}/k(0|[1-9][0-9]*)_[0-9a-f]{32})?$';

/** A path relative to the corpus root: no leading slash, no `.` or `..` segment, ending in `.md`. */
export const MARKDOWN_POINTER_PATTERN =
  '^(?!/)(?!(.*/)?\\.\\.?(/|$))[^\\x00]+\\.md$';

export const typeKeySchema = z.string().regex(new RegExp(TYPE_KEY_PATTERN));
export const recordIdSchema = z.string().regex(new RegExp(RECORD_ID_PATTERN));
export const recordPointerSchema = z
  .string()
  .regex(new RegExp(RECORD_POINTER_PATTERN));
export const markdownPointerSchema = z
  .string()
  .regex(new RegExp(MARKDOWN_POINTER_PATTERN));
