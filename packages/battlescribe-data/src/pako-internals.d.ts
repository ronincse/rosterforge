// Narrow declarations for the pinned pako 1.0.11 raw inflater. Its low-level
// output-buffer API lets ingestion enforce a boundary before more output exists.
declare module "pako/lib/zlib/zstream.js" {
  export default class ZStream {
    input: Uint8Array;
    next_in: number;
    avail_in: number;
    output: Uint8Array;
    next_out: number;
    avail_out: number;
    msg: string;
  }
}

declare module "pako/lib/zlib/inflate.js" {
  import type ZStream from "pako/lib/zlib/zstream.js";
  export function inflateInit2(stream: ZStream, windowBits: number): number;
  export function inflate(stream: ZStream, flush: number): number;
  export function inflateEnd(stream: ZStream): number;
}

declare module "pako/lib/zlib/crc32.js" {
  export default function crc32(
    crc: number,
    buffer: Uint8Array,
    length: number,
    position: number,
  ): number;
}
