import type { ContentHash, FileHash, Fingerprint } from "../src/index.js";

export function findFile(fingerprint: Fingerprint, path: string): FileHash | null {
  return fingerprint.files.find((file) => file.path === path) || null;
}

export function findData(fingerprint: Fingerprint, key: string): ContentHash | null {
  return fingerprint.content.find((input) => input.key === key) || null;
}
