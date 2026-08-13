import { describe, expect, it } from "vitest";

import {
  readBrowserBattleScribeFiles,
  type BrowserFileSource,
} from "./browser-files.js";

describe("readBrowserBattleScribeFiles", () => {
  it("preserves browser selection order, bytes, and optional media types", async () => {
    const files: BrowserFileSource[] = [
      browserFile("first.gst", [1, 2, 3], "application/xml"),
      browserFile("second.cat", [4, 5], ""),
    ];

    const result = await readBrowserBattleScribeFiles(files);

    expect(result.map(({ filename }) => filename)).toEqual([
      "first.gst",
      "second.cat",
    ]);
    expect(Array.from(result[0]?.bytes ?? [])).toEqual([1, 2, 3]);
    expect(Array.from(result[1]?.bytes ?? [])).toEqual([4, 5]);
    expect(result[0]).toMatchObject({
      filename: "first.gst",
      mediaType: "application/xml",
      origin: "browser",
    });
    expect(result[1]).not.toHaveProperty("mediaType");
  });
});

function browserFile(
  name: string,
  bytes: readonly number[],
  type: string,
): BrowserFileSource {
  return {
    name,
    type,
    arrayBuffer: async () => Uint8Array.from(bytes).buffer,
  };
}
