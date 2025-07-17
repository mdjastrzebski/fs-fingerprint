import { createHash } from "node:crypto";
import micromatch from "micromatch";

import type { FingerprintConfig, FingerprintHash, FingerprintSourceHash } from "./types.js";

const DEFAULT_HASH_ALGORITHM = "sha1";

export function hashContent(config: FingerprintConfig, content: string) {
  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  hasher.update(content);
  return hasher.digest("hex");
}

export function mergeSourceHashes(
  config: FingerprintConfig,
  hashes: readonly FingerprintSourceHash[]
): FingerprintHash {
  const sortedHashes = [...hashes].sort((a, b) => {
    return a.source.key.localeCompare(b.source.key);
  });

  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  for (const sourceHash of sortedHashes) {
    if (sourceHash.hash != null) {
      hasher.update(sourceHash.source.key);
      hasher.update(sourceHash.hash);
    }
  }

  return {
    hash: hasher.digest("hex"),
    sources: sortedHashes,
  };
}

export function matchesExcludePath(path: string, excludes?: readonly string[]): boolean {
  if (!excludes) {
    return false;
  }

  return micromatch.isMatch(path, excludes);
}

export function matchesIncludePath(path: string, includes: readonly string[]): boolean {
  return micromatch.isMatch(path, includes);
}
