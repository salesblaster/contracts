# `title_family`: the evaluation

Normative, at the definition's version 0.2.4. A runtime that derives `title_family` implements these steps exactly
and passes every vector in `conformance/source/title-family.v1.json`. A runtime that loads a table runs the load check
below and passes every vector in `conformance/source/title-family-table.v1.json`. The table is data
(`tables/<table_id>.v<major>.json`); the evaluation is the same for every table.

## The table's load check

A table is refused when it is loaded if it fails any of these. They run in this order, and the first failing reason is
the one reported:

1. `abbreviation_not_a_token`: a pair's `token` or `replacement` does not match `^[a-z0-9]+$` (a space, an uppercase
   letter, punctuation, or empty). A pair is invalid on its own, before pairs are compared, and the field grammar has
   no free pattern, so only the load check holds this one.
2. `duplicate_abbreviation_token`: a `token` appears in two pairs, even with the same replacement.
3. `families_missing`: the `functions` and `levels` can produce a family not in `families` (`other` included: it is
   always producible).
4. `families_extra`: `families` lists a value the table cannot produce.

So the families list is closed, and an instance's predicate on `title_family` can be checked against it. Because each
token appears once, the order of `abbreviations` cannot change a result; it is kept so that every runtime holds and
prints the same table.

## The evaluation

1. **Normalize.**
   - Unicode NFKD, then drop combining marks.
   - Lowercase.
   - Replace every run of characters outside `[a-z0-9]` with one space; trim.
   - If the result is empty, the result is **absent**.
2. **Tokenize** on single spaces. Replace each token by its pair's `replacement` when an `abbreviations` pair has it
   as `token`. The join of the tokens, with single spaces, is the **normalized title**.
3. **Match** a list entry (an exclusion, or one of a function's or a level's tokens) against the normalized title as
   a whole-word sequence. The entry is first normalized by steps 1 and 2, exactly as a title is, abbreviations
   included; an entry that normalizes to empty matches nothing. **So when an entry token is also an abbreviation
   key, the abbreviation wins on both sides:** the entry `mktg` normalizes to `marketing` and matches the title
   "Marketing Manager" as well as "Mktg Manager". Its tokens must then appear contiguously, bounded by the string's
   edges or spaces. `event` never matches inside `prevent`.
4. **Exclusions first:** any exclusion entry matching gives `other`.
5. **Function:** the first `functions` entry with any matching token gives the prefix. None gives `other`. Order makes
   "Head of Events & Marketing" an events title.
6. **Level:** the first `levels` entry with any matching token gives the suffix. None gives `other` (`no_level`).
7. **Result:** `prefix + "_" + suffix`, with `titleFamilyTable` set to the table's id and version, recorded as
   provenance on the admitted record.

`title_family` is **absent** (the field not set) when the title is absent or normalizes to empty, and `other` when a
title exists but is not one of the families. That keeps a source's silence apart from a negative fact.

The evaluation has no I/O, no clock, no locale beyond the steps above, and no model. The same title and table always
give the same result on every runtime.
