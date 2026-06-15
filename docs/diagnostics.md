# Diagnostics

Diagnostics are structured values with:

- stable code;
- human-readable message;
- severity (`info`, `warning`, or `error`);
- one or more impact domains;
- optional source location and details.

Current impact domains include import, parsing, security, compatibility,
resolution, validation, persistence, and internal failures.

Parser and archive failures return diagnostics rather than throwing expected
input errors. Unexpected programming failures may still throw.

Validation is represented with independent dimensions:

```ts
type ValidationStatus = {
  validity: "valid" | "invalid";
  completeness: "complete" | "incomplete";
};
```

An invalid roster may also have incomplete validation. Completeness must never
erase known validity errors.
