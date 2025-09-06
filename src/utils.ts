import { createHash } from "node:crypto";
import micromatch from "micromatch";

import { DEFAULT_HASH_ALGORITHM, EMPTY_HASH } from "./constants.js";
import type { FingerprintConfig, FingerprintInputHash, FingerprintResult } from "./types.js";

export function hashContent(content: string, config: FingerprintConfig) {
  if (config.hashAlgorithm === "null") {
    return EMPTY_HASH;
  }

  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  hasher.update(content);
  return hasher.digest("hex");
}

export function mergeHashes(
  hashes: readonly FingerprintInputHash[],
  config: FingerprintConfig,
): FingerprintResult {
  if (hashes.length === 0) {
    return {
      hash: EMPTY_HASH,
      inputs: [],
    };
  }

  const sortedHashes = [...hashes].sort((a, b) => {
    return a.key.localeCompare(b.key);
  });

  if (config.hashAlgorithm === "null") {
    return {
      hash: EMPTY_HASH,
      inputs: sortedHashes,
    };
  }

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

export function isExcludedPath(path: string, config: FingerprintConfig): boolean {
  return matchesAnyPattern(path, config.exclude) || (config.ignoreObject?.ignores(path) ?? false);
}

function matchesAnyPattern(path: string, patterns?: readonly string[]): boolean {
  if (!patterns) {
    return false;
  }

  return micromatch.isMatch(path, patterns);
}
