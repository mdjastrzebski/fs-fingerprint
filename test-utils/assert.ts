import type { DataHash, FileHash, Fingerprint } from "../src/index.js";

export function findFile(fingerprint: Fingerprint, path: string): FileHash | null {
  return fingerprint.files.find((file) => file.path === path) || null;
}

export function findData(fingerprint: Fingerprint, key: string): DataHash | null {
  return fingerprint.data.find((input) => input.key === key) || null;
}
