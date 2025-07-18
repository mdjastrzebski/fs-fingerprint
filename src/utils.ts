import { createHash } from "node:crypto";
import micromatch from "micromatch";
import { xxhash64 } from "xxhash-wasm";

import { DEFAULT_HASH_ALGORITHM, EMPTY_HASH } from "./constants.js";
import type { FingerprintConfig, FingerprintInputHash, FingerprintResult } from "./types.js";

export function hashContent(config: FingerprintConfig, content: string) {
  const algorithm = config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM;
  
  if (algorithm === "xxhash") {
    return xxhash64(content).toString(16);
  }
  
  const hasher = createHash(algorithm);
  hasher.update(content);
  return hasher.digest("hex");
}

export function mergeInputHashes(
  config: FingerprintConfig,
  hashes: readonly FingerprintInputHash[]
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

  const algorithm = config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM;
  
  if (algorithm === "xxhash") {
    let combinedContent = "";
    for (const inputHash of sortedHashes) {
      combinedContent += inputHash.key + inputHash.hash;
    }
    
    return {
      hash: xxhash64(combinedContent).toString(16),
      inputs: sortedHashes,
    };
  }
  
  const hasher = createHash(algorithm);
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
