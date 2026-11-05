// @salesblaster/contracts/core: what every context's published contracts share.
// Every major is a namespace (`v1`); the current major's names are also exported bare, so `PortError` is
// `v1.PortError` while v1 is current. The record envelope stays OCP's (ADR-OCP-007 §9.1), and its record-bytes check
// is re-exported from ocp-core in v1.
export * as v1 from './v1.js';
export * from './v1.js';
