// Metadata-only adapter for exactly JSZip 3.10.1. Public loadAsync turns this
// entry list into a map, losing duplicates and original directory paths.
declare module "jszip/lib/zipEntries.js" {
  export default class ZipEntries {
    constructor(options: { decodeFileName(bytes: Uint8Array): string });
    files: readonly unknown[];
    centralDirRecords: number;
    load(bytes: Uint8Array): void;
  }
}

declare module "jszip/lib/utf8.js" {
  export function utf8decode(bytes: Uint8Array): string;
}
