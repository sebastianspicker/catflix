# Security policy

Catflix is a local-first source alpha. When IndexedDB is available, the browser
database `catflix-local` stores your queue, progress, settings, legacy notes,
observations, comparisons, and asset provenance. If IndexedDB can't open, the
page falls back to temporary memory and reports degraded mode.

Exports can contain free-form household observations, so treat them as private
data. Strip unnecessary names and household details before sharing a
reproduction, and never attach a real export to a public issue.

Access to your browser profile is what controls these records. IndexedDB and JSON
exports are local but are **not encrypted** by Catflix. The import preview checks
bounded record counts, text lengths, identifiers, timestamps, and cross-record
links, but confirming an import still replaces all seven stores — export your
current record first if you might need it again.

## Reporting a vulnerability

Please don't open a public issue for an exploitable vulnerability or a report
that contains private observation data. This repository has no dedicated security
contact, so share a minimal report with the repository owner through a trusted
private channel. If none is available, don't publish the exploit or the private
data as a workaround.

Include the affected commit, reproduction steps, impact, and the smallest proof
of concept that demonstrates the issue.

## Supported versions

No version has been published yet, so no release is officially supported. Security
fixes target the latest source-alpha candidate until a release policy exists.
