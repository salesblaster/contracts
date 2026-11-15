import { z } from 'zod/v4';
import { fieldGrammar } from '../core/index.js';

/**
 * The `title_family` table's shape. The table is a data file, so its keys are snake_case. The evaluation is normative
 * text (`title-family/EVALUATION.md`), not code here: each runtime implements it and passes the vectors in
 * `conformance/source/title-family.v1.json`, and a loader refuses a table that fails the load check in
 * `conformance/source/title-family-table.v1.json`. The first table is `title-family/tables/events-marketing.v1.json`.
 */
export interface TitleFamilyTable {
  /** Names its vocabulary, never a client: `events-marketing`. */
  readonly table_id: string;
  /** The table's own version (semver): a new token is a minor version, a removed token or a changed order a major one. */
  readonly version: string;
  /** Closed: every `family_prefix + "_" + suffix` the table can produce, plus `other`; checked at load. */
  readonly families: readonly string[];
  /** Token to token, applied after normalization: an ordered list of pairs, each token at most once, each side one token. */
  readonly abbreviations: readonly {
    readonly token: string;
    readonly replacement: string;
  }[];
  /** Token sequences; any match gives `other`. */
  readonly exclusions: readonly string[];
  /** Ordered: the first function that matches wins. */
  readonly functions: readonly {
    readonly family_prefix: string;
    readonly tokens: readonly string[];
  }[];
  /** Ordered: the first level that matches wins. */
  readonly levels: readonly {
    readonly suffix: string;
    readonly tokens: readonly string[];
  }[];
  /** A function word with no level word is not a buyer title. */
  readonly no_level: 'other';
}

/** Which table, and which version of it, derived a `titleFamily`: carried in the batch's camelCase. */
export interface TitleFamilyTableRef {
  readonly tableId: string;
  readonly version: string;
}

const tokenList = () => z.array(fieldGrammar.string());

/**
 * The table, closed at every level, in the field grammar's core types only. What the grammar cannot state is the
 * load check, a loader's rule with its vectors (`conformance/source/title-family-table.v1.json`): each abbreviation
 * side a single token, each token at most once, and the families list closed.
 */
export const titleFamilyTableSchema = z
  .object({
    table_id: fieldGrammar.string(),
    version: fieldGrammar.string(),
    families: tokenList(),
    abbreviations: z.array(
      z
        .object({
          token: fieldGrammar.string(),
          replacement: fieldGrammar.string(),
        })
        .strict(),
    ),
    exclusions: tokenList(),
    functions: z.array(
      z
        .object({ family_prefix: fieldGrammar.string(), tokens: tokenList() })
        .strict(),
    ),
    levels: z.array(
      z.object({ suffix: fieldGrammar.string(), tokens: tokenList() }).strict(),
    ),
    no_level: z.enum(['other']),
  })
  .strict();

export const titleFamilyTableRefSchema = z
  .object({ tableId: fieldGrammar.string(), version: fieldGrammar.string() })
  .strict();
