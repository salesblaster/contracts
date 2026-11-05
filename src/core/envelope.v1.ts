// The default import is ocp-core's module.exports, which every version provides: a named import of `records` fails at load
// under Node's ES modules with ocp-core 0.8.0.
import ocpCore from 'ocp-core';

const { records } = ocpCore;

/**
 * The record-bytes check of the Organizational Context Protocol, re-exported from `ocp-core`, so a runtime validates a
 * record's stored bytes with the protocol's own function.
 *
 * This is one of the two modules that may import `ocp-core` (the other is the library's visibility module); its ESLint
 * configuration refuses it anywhere else. OCP owns the envelope and the stored bytes (ADR-OCP-007 §8.1, §9.1), so
 * nothing here restates them: the types below are read from `ocp-core`'s own declarations, and the check is
 * `ocp-core`'s function, not a copy. The record envelope's types join this module when an `ocp-core` release
 * exports them.
 */

type CheckRecordBytes = typeof records.checkRecordBytes;

/** The corpus class a record's bytes are checked under (`fixture`, `private_client_instance` or `shared`). */
export type CorpusClass = Parameters<CheckRecordBytes>[1];

/** `code` is `null` when the bytes are a valid record for the class, and names the refusal otherwise. */
export type RecordBytesVerdict = ReturnType<CheckRecordBytes>;

/** Checks one record file's bytes against the protocol's stored form and envelope, for one corpus class. */
export const checkRecordBytes: CheckRecordBytes = records.checkRecordBytes;

/** The corpus classes `checkRecordBytes` accepts, as `ocp-core` lists them. */
export const CORPUS_CLASSES: readonly string[] = records.CORPUS_CLASSES;
