import type { LocalBattleScribeFile } from "@rosterforge/repository";

export interface BrowserFileSource {
  readonly name: string;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export async function readBrowserBattleScribeFiles(
  files: readonly BrowserFileSource[],
): Promise<readonly LocalBattleScribeFile[]> {
  return Promise.all(
    files.map(async (file) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      return {
        filename: file.name,
        bytes,
        origin: "browser",
        ...(file.type === "" ? {} : { mediaType: file.type }),
      };
    }),
  );
}
