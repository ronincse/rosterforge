import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const fixtureRoot = new URL("../fixtures/", import.meta.url);

export function fixtureBytes(name: string): Uint8Array {
  return readFileSync(new URL(name, fixtureRoot));
}

export function fixturePath(name: string): string {
  return fileURLToPath(new URL(name, fixtureRoot));
}
