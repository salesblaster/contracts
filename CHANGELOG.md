# Changelog

## 0.1.0 (2026-11-05)

- Every entry point exports its majors as namespaces (`v1`) and the current major's names bare; no type name
  carries a version.

- `core`: the field grammar's core types (`fieldGrammar`), record ids, record pointers, markdown pointers and type
  keys, and the vendor-neutral error arms (`PortError`), with their JSON Schemas under `schemas/core/`.
- `core`: `checkRecordBytes`, `CORPUS_CLASSES`, `CorpusClass` and `RecordBytesVerdict`, re-exported from `ocp-core`
  0.8.0, its one runtime dependency.
- `enrich`: `GraderCalibration` (its schema `schemas/enrich/grader-calibration.v1.json`), `GraderConfiguration` with
  its eight parts, the runtime included, and the calibration predicate `checkCalibration`, `isCalibrated` and
  `graderConfigurationOf`.
- `enrich`: `Lead`, `VerifiedLead` and `VerificationStatus`, with `leadSchema` and `verifiedLeadSchema`
  (`schemas/enrich/lead.v1.json`, `schemas/enrich/verified-lead.v1.json`); the payload of `lead.scored.v1` as
  `LeadScored`, with `ScoreOutcome`, `Grade`, `Disqualifier`, `InferredInput` and `leadScoredSchema`
  (`schemas/enrich/lead-scored.v1.json`); and `RubricBands` with `rubricBandsSchema`
  (`schemas/enrich/rubric-bands.v1.json`). `ScoreProvenance` is read from `LeadScored`, `CalibrationGrade` is the part of
  a `Grade` the predicate reads (so a score's own grades pass to it), and `graderConfigurationSchema` is exported.
- Conformance vectors: `conformance/core/email-account-key.v1.json` (22 vectors) and
  `conformance/source/predicate.v1.json` (40 vectors), and `conformance/enrich/calibration.v1.json` (34 vectors:
  C-01 to C-27, C-18b and CO-1 to CO-6).
- Conformance vectors: `conformance/enrich/lead.v1.json` (11 vectors), `conformance/enrich/lead-scored.v1.json` (28
  vectors: S-01 to S-22 and V-1 to V-6) and `conformance/enrich/rubric-bands.v1.json` (11 vectors). Each names the rule
  a vector breaks by a name its rule text defines.
