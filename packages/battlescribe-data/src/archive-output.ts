// Bounded extraction below the ZIP metadata layer. The fixed-size raw-inflate
// buffers are owned here, so forged ZIP sizes cannot drive unbounded allocation.
import crc32 from "pako/lib/zlib/crc32.js";
import { inflate, inflateEnd, inflateInit2 } from "pako/lib/zlib/inflate.js";
import ZStream from "pako/lib/zlib/zstream.js";

export interface ArchivePayload {
  readonly bytes: Uint8Array;
  readonly method: "STORE" | "DEFLATE";
  readonly expandedSize: number;
  readonly crc: number;
}

export class ArchiveOutputLimitError extends Error {
  constructor(readonly observedBytes: number) {
    super("Archive output exceeded the configured byte boundary.");
  }
}

/** Extracts at most `limit` accepted bytes, with one sentinel byte of inflater
 * output to detect overflow. CRC and declared length are checked only afterward.
 * Peak temporary output is bounded by accepted chunks + final copy + 32 KiB
 * inflater window; neither declared nor actual oversized lengths are allocated.
 */
export function extractArchivePayload(payload: ArchivePayload, limit: number): Uint8Array {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new Error("Invalid archive output limit.");
  }
  if (payload.method === "STORE") {
    if (payload.bytes.length > limit) {
      throw new ArchiveOutputLimitError(limit + 1);
    }
    verifyPayload(payload, payload.bytes);
    return payload.bytes.slice();
  }

  const stream = new ZStream();
  if (inflateInit2(stream, -15) !== 0) {
    throw new Error("Could not initialize raw archive inflation.");
  }
  stream.input = payload.bytes;
  stream.next_in = 0;
  stream.avail_in = payload.bytes.length;
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      // A fresh bounded output window prevents even synchronous inflate from
      // emitting a complete bomb before a downstream data handler can abort it.
      const output = new Uint8Array(Math.min(16_384, limit - length + 1));
      stream.output = output;
      stream.next_out = 0;
      stream.avail_out = output.length;
      const inputBefore = stream.avail_in;
      const status = inflate(stream, 0);
      length += stream.next_out;
      if (length > limit) {
        throw new ArchiveOutputLimitError(length);
      }
      chunks.push(output.subarray(0, stream.next_out));
      if (status === 1) {
        if (stream.avail_in !== 0) {
          throw new Error("Archive deflate stream has trailing compressed bytes.");
        }
        break;
      }
      if (status !== 0 || (stream.next_out === 0 && inputBefore === stream.avail_in)) {
        throw new Error(stream.msg || "Invalid or truncated archive deflate stream.");
      }
    }
  } finally {
    inflateEnd(stream);
  }

  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  verifyPayload(payload, output);
  return output;
}

function verifyPayload(payload: ArchivePayload, bytes: Uint8Array): void {
  if (bytes.length !== payload.expandedSize) {
    throw new Error("Archive expanded length does not match its metadata.");
  }
  if (crc32(0, bytes, bytes.length, 0) !== payload.crc) {
    throw new Error("Archive CRC32 mismatch.");
  }
}
