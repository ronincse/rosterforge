// JSZip's metadata parser probes readable-stream even though browser ingestion
// never uses Node stream adapters. Explicitly report the capability unavailable;
// do not polyfill a second unbounded extraction path into the browser bundle.
export const Readable = undefined;
