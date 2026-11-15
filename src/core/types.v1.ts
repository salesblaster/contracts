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

/**
 * A port's answer: the value, or a `PortError`. A port never throws across the seam. A domain answer (a lead
 * refused, a campaign not found) is a closed outcome inside `value`, never an error; `PortError` covers only
 * reachability and transport.
 */
export type PortResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: PortError };

/** The unit a metered call is counted in. */
export type CostUnitKind = 'credits' | 'tokens' | 'runs' | 'rows';

/**
 * What a cost's `units` count is:
 * - `vendor_stated`: the vendor's own figure for this call or job;
 * - `presumed_per_call`: a count of completed calls at about one unit each, a presumption;
 * - `unknown`: the call billed, and the count is not known (`units` is `null`, never 0).
 */
export type CostBasis = 'vendor_stated' | 'presumed_per_call' | 'unknown';

/**
 * What one metered call cost, in the shape of SalesBlaster's cost ledger. Four invariants hold, and
 * `costSchema` refuses a value that breaks any of them:
 * - `basis` is `unknown` if and only if `units` is `null`;
 * - `units`, when present, is a non-negative integer;
 * - `amount`, when present, is an unsigned decimal string, such as `"0.0042"`;
 * - an `amount` needs its `currency` and `priceVersion`.
 *
 * A money `amount` exists only from a ratified price, so it is `null` until one exists.
 */
export interface Cost {
  readonly units: number | null;
  readonly unitKind: CostUnitKind;
  readonly basis: CostBasis;
  readonly amount: string | null;
  readonly currency: string | null;
  readonly priceVersion: string | null;
}

/**
 * A metered port's answer. BOTH arms carry a required `cost`: a failed call can bill, and `null` means the call
 * billed nothing. An optional field would let an adapter stay silent about money spent.
 */
export type MeteredPortResult<T> =
  | { readonly ok: true; readonly value: T; readonly cost: Cost | null }
  | {
      readonly ok: false;
      readonly error: PortError;
      readonly cost: Cost | null;
    };
