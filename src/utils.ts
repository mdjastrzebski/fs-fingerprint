import { createHash } from "node:crypto";
import { glob, globSync } from "tinyglobby";

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

/**
 * Combine multiple input hashes into a single deterministic fingerprint.
 *
 * The inputs are first sorted by their `key` (lexicographic) to make the result order-independent.
 * If `config.hashAlgorithm` is `"null"`, returns `{ hash: EMPTY_HASH, inputs: sortedInputs }`.
 * Otherwise the sorted inputs are fed into the configured hash algorithm to produce a hex digest.
 *
 * @param hashes - Array of input hashes (each with a `key` and `hash`) to merge.
 * @param config - Fingerprinting configuration (controls which hash algorithm to use).
 * @returns A FingerprintResult containing the combined hex `hash` and the sorted `inputs`, or `null` if `hashes` is empty.
 */
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

/**
 * Remove a leading "./" from a file path if present.
 *
 * Returns the input `path` with a single leading "./" removed; paths that do not start
 * with "./" are returned unchanged. This is a minimal, string-level normalization
 * (it does not resolve segments like ".." or convert path separators).
 *
 * @param path - The file path to normalize
 * @returns The normalized path without a leading "./"
 */
export function normalizeFilePath(path: string): string {
  return path.startsWith("./") ? path.slice(2) : path;
}

type GenerateFileListOptions = {
  rootDir: string;
  include?: string[];
  exclude?: string[];
  excludeFn?: (path: string) => boolean;
};

/**
 * Generate a sorted list of paths under a root directory that match given glob patterns.
 *
 * Performs a two-pass glob: the first pass collects explicit file matches and directory globs
 * (directory matches end with `/` are expanded to `<dir>/**`), the second pass expands those
 * directory globs and adds their results. The final list is optionally filtered by `excludeFn`
 * and returned sorted. All paths are returned relative to `rootDir`.
 *
 * @param rootDir - Base directory used as the current working directory for globbing.
 * @param include - Glob patterns to include (relative to `rootDir`). Defaults to `["*"]`.
 * @param exclude - Glob patterns to ignore (passed to the globber).
 * @param excludeFn - Optional predicate that, when returns `true` for a path, excludes that path from the final result.
 * @returns A sorted array of paths (relative to `rootDir`) that matched the include patterns, excluding any ignored by `exclude` or `excludeFn`.
 */
export async function generateFileList({
  rootDir,
  include = ["*"],
  exclude,
  excludeFn,
}: GenerateFileListOptions): Promise<string[]> {
  const firstPass = await glob(include, {
    cwd: rootDir,
    ignore: exclude,
    onlyFiles: false,
  });

  const files = new Set<string>();
  const dirs = new Set<string>();
  for (const path of firstPass) {
    if (path.endsWith("/")) {
      dirs.add(`${path}**`);
    } else {
      files.add(path);
    }
  }

  const secondPass = await glob(Array.from(dirs), {
    cwd: rootDir,
    ignore: exclude,
  });
  for (const path of secondPass) {
    files.add(path);
  }

  let result = Array.from(files);
  if (excludeFn) {
    result = result.filter((path) => !excludeFn(path));
  }

  result.sort();
  return result;
}

/**
 * Synchronously generates a deterministic list of file paths under `rootDir` matching the given glob patterns.
 *
 * Performs a two-pass glob expansion:
 * 1. Runs `include` globs (with `cwd = rootDir`) and separates file matches from directory matches (directories end with `/`).
 * 2. Expands directory matches by globbing `"<dir>**"` to include their contents.
 *
 * The final result is de-duplicated, optionally filtered by `excludeFn`, sorted, and returned.
 *
 * Notes:
 * - `include` and `exclude` are glob pattern arrays (default `include = ["*"]`).
 * - `exclude` is passed to the globber's ignore option; `excludeFn`, if provided, receives each resulting path and should return `true` to omit it.
 * - Returned paths are relative to `rootDir`.
 *
 * @param rootDir - Base directory used as the glob `cwd`.
 * @param include - Glob patterns to include (defaults to `["*"]`).
 * @param exclude - Glob patterns to ignore during globbing.
 * @param excludeFn - Optional predicate to filter the final result; return `true` to exclude a path.
 * @returns A sorted array of unique file paths (relative to `rootDir`) matching the inputs.
 */
export function generateFileListSync({
  rootDir,
  include = ["*"],
  exclude,
  excludeFn,
}: GenerateFileListOptions): string[] {
  const firstPass = globSync(include, {
    cwd: rootDir,
    ignore: exclude,
    onlyFiles: false,
  });

  const files = new Set<string>();
  const dirs = new Set<string>();
  for (const path of firstPass) {
    if (path.endsWith("/")) {
      dirs.add(`${path}**`);
    } else {
      files.add(path);
    }
  }

  const secondPass = globSync(Array.from(dirs), {
    cwd: rootDir,
    ignore: exclude,
  });
  for (const path of secondPass) {
    files.add(path);
  }

  let result = Array.from(files);
  if (excludeFn) {
    result = result.filter((path) => !excludeFn(path));
  }

  result.sort();
  return result;
}
