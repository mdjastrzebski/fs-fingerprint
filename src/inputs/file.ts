import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { EMPTY_HASH } from "../constants.js";
import type { FingerprintConfig, FingerprintFileHash } from "../types.js";
import { hashContent, normalizeFilePath } from "../utils.js";

/**
 * Calculate a fingerprint hash object for a file at the given path.
 *
 * If `config.hashAlgorithm` is `"null"`, the function returns a FingerprintFileHash
 * with `hash` set to `EMPTY_HASH` without reading the file. Otherwise, it reads
 * the file (joined with `config.rootDir`), hashes its UTF-8 contents using
 * `hashContent(..., config)`, and returns the resulting FingerprintFileHash.
 *
 * @param path - File path (will be normalized and used in the returned `key` and `path`)
 * @param config - Fingerprint configuration (provides `rootDir` and hashing settings)
 * @returns A FingerprintFileHash with `type: "file"`, `key: "file:<normalizedPath>"`, `hash`, and `path`
 *
 * Note: I/O errors from reading the file will propagate as rejections from this async function.
 */
export async function calculateFileHash(
  path: string,
  config: FingerprintConfig,
): Promise<FingerprintFileHash> {
  const normalizedPath = normalizeFilePath(path);
  if (config.hashAlgorithm === "null") {
    return {
      type: "file",
      key: `file:${normalizedPath}`,
      hash: EMPTY_HASH,
      path: normalizedPath,
    };
  }

  const pathWithRoot = join(config.rootDir, path);
  const content = await readFile(pathWithRoot, "utf8");
  return {
    type: "file",
    key: `file:${normalizedPath}`,
    hash: hashContent(content, config),
    path: normalizedPath,
  };
}

/**
 * Synchronously compute the fingerprint file hash for a given file path using the provided config.
 *
 * If `config.hashAlgorithm` is `"null"`, returns a `FingerprintFileHash` with `EMPTY_HASH`. Otherwise the file
 * located at `join(config.rootDir, path)` is read synchronously and hashed according to `config`.
 *
 * @param path - File path to fingerprint (will be normalized internally).
 * @param config - Fingerprint configuration (must include `rootDir` and `hashAlgorithm`).
 * @returns A `FingerprintFileHash` with `type: "file"`, `key: "file:<normalizedPath>"`, `hash`, and `path` set to the normalized path.
 * @throws Propagates filesystem read errors if the file cannot be read.
 */
export function calculateFileHashSync(
  path: string,
  config: FingerprintConfig,
): FingerprintFileHash {
  const normalizedPath = normalizeFilePath(path);
  if (config.hashAlgorithm === "null") {
    return {
      type: "file",
      key: `file:${normalizedPath}`,
      hash: EMPTY_HASH,
      path: normalizedPath,
    };
  }

  const pathWithRoot = join(config.rootDir, path);
  const content = readFileSync(pathWithRoot, "utf8");
  return {
    type: "file",
    key: `file:${normalizedPath}`,
    hash: hashContent(content, config),
    path: normalizedPath,
  };
}
