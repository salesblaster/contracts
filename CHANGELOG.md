# Changelog

## 0.3.0 (2026-11-24)

Additive (minor): three new entry points, each with its record contracts and JSON Schemas. Every 0.2.0 file and name is
unchanged.

- `conversations`, a new entry point: `Conversation` and `ConversationMessage`, the record data of `conversation@1` and
  its one child kind, with `conversationSchema` and `conversationMessageSchema`; `ConversationScope`, its membership
  predicate, with `conversationScopeSchema`; `ConversationNotEmitted`, the collection manifest's aggregate, with
  `conversationNotEmittedSchema`; and `conversationTypeFacts`. Schemas under `schemas/conversations/`:
  `conversation`, `conversation-message`, `conversation-scope` and `conversation-not-emitted`.
- `sdr`, a new entry point: `Classification`, the record data of `classification@1`, with `classificationSchema`;
  `classificationLogicVersionSchema`; `ClassificationReportNotEmitted`, the per-reason count of verdicts not emitted,
  whose home is the generating unit's commit subject line on the records ref, with
  `classificationReportNotEmittedSchema`; `CLASSIFICATION_NOT_EMITTED_REASONS`, its reason tokens, with
  `classificationNotEmittedReasonSchema`; `classificationReportNotEmittedReaderSchema` and
  `ClassificationNotEmittedCounts`, the reader's open form (writer-closed, reader-open: a new token is an additive
  minor); and `classificationTypeFacts`. Schemas under `schemas/sdr/`:
  `classification` and `classification-report-not-emitted`.
- `crm`, a new entry point: `Person`, `Organization` and `Deal`, the record data of `person@1`, `organization@1` and
  `deal@1` (projections of the client's CRM), with `personSchema`, `organizationSchema` and `dealSchema`; their
  membership predicates `PersonScope`, `OrganizationScope` and `DealScope`, with their schemas; `isDealInScope`, the
  reference reading of `DealScope` (its `pipelines`, `labels`, `cohort_equals` and `cohort_prefix`, against the deal's
  `cohort`); `ExternalRef`, with
  `externalRefSchema`; and `personTypeFacts`, `organizationTypeFacts` and `dealTypeFacts`. Schemas under
  `schemas/crm/`: `person`, `person-scope`, `organization`, `organization-scope`, `deal` and `deal-scope`.
- `crm`'s `person@1` also carries every contact point its CRM holds: `full_name`, and
  `contact_points`, each a `PersonContactPoint` (`type`, `handle`, `provenance`, `primary`, `label`), the observed part
  of the canonical contact-point model's ContactPoint. Its cross-field rules are the ruled vectors `conformance/crm/person.v1.json`.
- `source` gains `CONTACT_POINT_TYPES`, `ContactPointType` and `contactPointTypeSchema`: the canonical model's closed
  contact-point type enum, in its one published home.
- Documentation: 0.2.0's note on `costSchema` now says which of its four invariants the JSON Schema states (the two
  per-field ones) and where the cross-field pair is (the vectors). No file or name changes.

## 0.2.0 (2026-11-15)

Additive (minor): two new entry points, new shapes and ports in `core` and `enrich`, and new conformance vectors. Every
0.1.0 file and name is unchanged.

- `core`: `PortResult<T>`, a port's answer (a value or a `PortError`; a port never throws across the seam), and
  `MeteredPortResult<T>`, whose two arms both carry a required `cost: Cost | null` (`null` means the call billed
  nothing). `Cost`, `CostUnitKind` and `CostBasis`, with `costSchema` (`schemas/core/cost.v1.json`) and its vectors
  (`conformance/core/cost.v1.json`). `costSchema` refuses a value that breaks any of its four invariants; the JSON
  Schema states the two per-field ones, and the cross-field pair is in the vectors.
- `enrich`: `VerificationProviderPort`, a metered port with one verdict per distinct submitted address. An address
  the vendor did not answer is `unknown`, never absent. `EmailVerificationVerdict`; `checkVerificationVerdicts`, a
  check of an adapter's verdicts against the submitted addresses; and `verdictForKey`, one email-account-key's
  verdict derived from its variants' observed verdicts, with its vectors (`conformance/enrich/verdict-for-key.v1.json`).
- `campaigns`, a new entry point: `ExternalSequencerLeadUploadPort`, `SequencerLaunchPort` (`sending`, `not_found`
  or `not_startable`), `ExternalCampaignTransitionPort` and `ExternalSuppressionMirrorPort`, with `SequencerLead` and
  their outcome types. `checkSequencerUploadResults` and `checkBlocklistEntries` are predicates over an adapter's
  output, not dispositions: the consumer decides what a result that does not hold means. The four upload outcomes are
  part of the contract, so a fifth is a new major.
- `source`, a new entry point: `AdmittedProspect` and `AdmittedProspectBatch`, with `admittedProspectSchema` and
  `admittedProspectBatchSchema`; `RejectReason`; and `TitleFamilyTable` and `TitleFamilyTableRef`, with their
  schemas under `schemas/source/`. Vectors under `conformance/source/`: `admitted-prospect-batch`, `admission-merge`,
  `title-family` and `title-family-table`.

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
