# Architecture

## Package Direction

```text
foundation
  ^
  |
battlescribe-data

foundation <- repository <- persistence
foundation <- data-graph
foundation <- roster-model
data-graph + roster-model <- evaluation
all application-facing packages <- apps/web
```

The arrows point from a package to a dependency. Circular dependencies are
forbidden. Core packages cannot import React, Vite, Zustand, or application
components.

## Current Slice

`foundation` defines stable IDs, source provenance, source locations,
diagnostics, result values, and independent validation validity/completeness
contracts.

`battlescribe-data` accepts untrusted `.gst`, `.cat`, `.gstz`, and `.catz`
input. It retains a copy of original imported bytes and, for archives, the
extracted XML bytes with separate provenance. It rejects declarations before
parsing, enforces resource limits, keeps an ordered generic XML representation,
and projects known root metadata. It does not resolve IDs or interpret rules.

`test-fixtures` owns small fictional fixture files. Other packages are
placeholders for later sessions.

## Raw Document Boundary

The raw document is intentionally not a complete BattleScribe domain model.
Known metadata is a projection over a generic ordered XML tree. Unknown
elements, attributes, namespace declarations, and text remain observable.
Exact byte-for-byte XML reserialization is not promised; original bytes are
retained separately for that purpose.
