import { createHash } from "node:crypto";
import fastglob from "fast-glob";

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
): FingerprintResult | null {
  if (hashes.length === 0) {
    return null;
  }

  const sortedHashes = [...hashes].sort((a, b) => a.key.localeCompare(b.key));

  if (config.hashAlgorithm === "null") {
    return {
      hash: EMPTY_HASH,
      inputs: sortedHashes,
    };
  }

  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  for (const inputHash of sortedHashes) {
    hasher.update(inputHash.key);
    hasher.update("\0");
    hasher.update(inputHash.hash);
    hasher.update("\0\0");
  }

  return {
    hash: hasher.digest("hex"),
    inputs: sortedHashes,
  };
}

export function isExcludedPath(path: string, config: FingerprintConfig): boolean {
  return Boolean(
    config.exclude?.some((matcher) => matcher(path)) || config.ignoreObject?.ignores(path),
  );
}

export function normalizeFilePath(path: string): string {
  return path.startsWith("./") ? path.slice(2) : path;
}

export function normalizeDirPath(path: string): string {
  let result = path;
  result = result.startsWith("./") ? result.slice(2) : result;
  result = result.endsWith("/") ? result : `${result}/`;
  return result;
}

type GenerateFileListOptions = {
  rootDir: string;
  include?: string[];
  exclude?: string[];
};

export function generateFileList({
  rootDir,
  include = ["**"],
  exclude,
}: GenerateFileListOptions): string[] {
  console.log("\nGenerate file list", include);

  const staticPatterns = include.filter((pattern) => !fastglob.isDynamicPattern(pattern));
  const staticPatternsWithContents = staticPatterns.map((pattern) =>
    pattern.endsWith("/") ? `${pattern}**` : `${pattern}/**`,
  );

  const includePatterns = [...include, ...staticPatternsWithContents];
  console.log("  Using patterns:", includePatterns);

  const files = fastglob
    .sync(includePatterns, {
      cwd: rootDir,
      ignore: exclude,
      unique: true,
    })
    .sort();

  console.log("  All files:", files);

  return files;
}
