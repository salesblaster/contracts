/**
 * The plain TypeScript types of `core` version 1, with no Zod in this file: a runtime that implements a port
 * reads these, and the Zod schemas beside them parse at the seam.
 */

/** A record type key, a child kind or a provider key (`^[a-z][a-z0-9_]{0,62}$`). */
export type TypeKey = string;

/** `k<generation>_<32 lowercase hex>`. */
export type RecordId = string;

/** `record:<type>/<id>`, optionally `#<child kind>/<id>`. */
export type RecordPointer = string;

/** A corpus-relative markdown path. */
export type MarkdownPointer = string;

/**
 * The vendor-neutral error arms a port returns. A closed set that grows additively.
 *
 * - `unavailable`: the capability is unconfigured or unreachable, so nothing was attempted (a missing credential).
 * - `request_failed`: the capability was reached and the request failed (transport, the provider's refusal, a cancel
 *   or a timeout).
 *
 * `message` is for an operator; it carries no vendor payload, and the vendor's
 * own error stays inside the adapter.
 */
export type PortErrorKind = 'unavailable' | 'request_failed';

export interface PortError {
  readonly kind: PortErrorKind;
  readonly message: string;
}
