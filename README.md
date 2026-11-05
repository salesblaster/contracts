> This repository is a one-way mirror of the published face of `@salesblaster/contracts`, updated at each
> publication. Changes are not taken here: open an issue instead.

# @salesblaster/contracts

The published language that OCP snapshot runtimes share: the shapes of ports, integration events and records, written
in Zod, with a JSON Schema generated from each for runtimes that are not TypeScript.

The package carries shapes, data and normative text only. It carries no implementation, no adapter, no prompt and no
scoring weight or threshold.

## Entry points

| Import | Holds |
|---|---|
| `@salesblaster/contracts/core` | the field grammar's core types, record ids and pointers, the vendor-neutral error arms, and `ocp-core`'s record-bytes check |
| `@salesblaster/contracts/enrich` | `Lead` and `VerifiedLead`, the one lead shape and the lead with its email verdict; `LeadScored`, the payload of `lead.scored.v1`; `RubricBands`, the labels a rubric version declares; `GraderCalibration`, the bar table for one grader configuration; and the calibration predicate `checkCalibration` (with `isCalibrated` and `graderConfigurationOf`), which takes a score's own grades |
| `@salesblaster/contracts/schemas/<context>/<schema>.v<major>.json` | the generated JSON Schemas |
| `@salesblaster/contracts/conformance/<context>/<name>.v<major>.json` | conformance vectors: inputs and expected results a runtime must reproduce |

More contexts (`source`, `campaigns`, `sdr`, `crm`) are added as they are published.

## Names and majors

A type's name never carries its version. Each entry point exports every major of its shapes as a namespace, and the
current major's names bare:

```ts
import { PortError, v1 } from '@salesblaster/contracts/core';
// PortError is v1.PortError while v1 is the current major.
```

A breaking change to a shape adds the next namespace (`v2`) beside the old one; the bare names move to it only in a
breaking release of the package. Import a namespace to stay on one major across releases. The version also lives in
each schema's `$id` and its file name.

## Versioning

Published contracts evolve additively within a version. A breaking change is a new major, shipped beside the old one
as a new file (`<schema>.v2.json`). Every schema's `$id` is `urn:salesblaster:contracts:<context>:<schema>:v<major>`;
the minor never appears in an `$id`. Published schemas are closed (`additionalProperties: false`), so a reader on an
older minor rejects a field it does not know.

## Conformance vectors

A schema states a shape; it cannot state every rule a producer keeps. Where a rule matters across runtimes, the package
ships it as vectors: each file names its rule in prose and lists inputs with the result a conforming runtime gives.
`core/email-account-key` is the identity key two runtimes join their records on; `source/predicate` is the
three-valued logic a segment predicate is evaluated under; `enrich/calibration` is the calibration predicate;
`enrich/lead`, `enrich/lead-scored` and `enrich/rubric-bands` are the rules each shape's producer keeps that its schema
cannot state, `lead-scored`'s composite arithmetic included. A vector that breaks a rule names it by a name its file's
rule defines. Only ruled vectors ship.

## Zod

`zod` is a peer dependency. The schemas are written against the `zod/v4` API, which `zod` 3.25 and later carry.

## The record envelope

The envelope every record carries is the Organizational Context Protocol's, published with `ocp-core`. This package
holds the contracts for `data` and never a second envelope. `core` re-exports `ocp-core`'s `checkRecordBytes`, so a
runtime validates a record's stored bytes with the protocol's own check; `ocp-core` is the package's one runtime
dependency, pinned exactly.
