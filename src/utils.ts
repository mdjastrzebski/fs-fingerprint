import { createHash } from "node:crypto";
import micromatch from "micromatch";

import type { FingerprintConfig, FingerprintHash, FingerprintInputHash } from "./types.js";

const DEFAULT_HASH_ALGORITHM = "sha1";

export function hashContent(config: FingerprintConfig, content: string) {
  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  hasher.update(content);
  return hasher.digest("hex");
}

export function mergeInputHashes(
  config: FingerprintConfig,
  hashes: readonly FingerprintInputHash[]
): FingerprintHash {
  const sortedHashes = [...hashes].sort((a, b) => {
    return a.input.key.localeCompare(b.input.key);
  });

  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  for (const inputHash of sortedHashes) {
    if (inputHash.hash != null) {
      hasher.update(inputHash.input.key);
      hasher.update(inputHash.hash);
    }
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
