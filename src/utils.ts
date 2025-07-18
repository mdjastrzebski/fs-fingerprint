import { createHash } from "node:crypto";
import micromatch from "micromatch";

import { DEFAULT_HASH_ALGORITHM } from "./constants.js";
import type { FingerprintConfig, FingerprintInputHash, FingerprintResult } from "./types.js";

export function hashContent(config: FingerprintConfig, content: string) {
  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  hasher.update(content);
  return hasher.digest("hex");
}

export function mergeInputHashes(
  config: FingerprintConfig,
  hashes: readonly FingerprintInputHash[]
): FingerprintResult {
  const sortedHashes = [...hashes].sort((a, b) => {
    return a.key.localeCompare(b.key);
  });

  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  for (const inputHash of sortedHashes) {
    hasher.update(inputHash.key);
    hasher.update(inputHash.hash);
  }

  return {
    hash: hasher.digest("hex"),
    inputs: sortedHashes,
  };
}

export function matchesAnyPattern(path: string, patterns?: readonly string[]): boolean {
  if (!patterns) {
    return false;
  }

  return micromatch.isMatch(path, patterns);
}
