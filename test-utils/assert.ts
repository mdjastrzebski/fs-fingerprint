import type { FileHash, Fingerprint, FingerprintInputHash } from "../src/index.js";

export function findFile(fingerprint: Fingerprint, path: string): FileHash | null {
  return fingerprint.files.find((file) => file.path === path) || null;
}

export function findInput(fingerprint: Fingerprint, key: string): FingerprintInputHash | null {
  return fingerprint.inputs.find((input) => input.key === `${input.type}:${key}`) || null;
}
