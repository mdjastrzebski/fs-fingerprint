import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { EMPTY_HASH } from "../constants.js";
import type { Config, FileHash } from "../types.js";
import { hashData, normalizeFilePath } from "../utils.js";

/**
 * Reads a file and returns its content hash.
 *
 * @param path - File path relative to `config.basePath`
 * @param config - Hashing configuration
 */
export async function calculateFileHash(path: string, config: Config): Promise<FileHash> {
  const normalizedPath = normalizeFilePath(path);
  /** @internal "null" algorithm skips hashing — used for testing only */
  if (config.hashAlgorithm === "null") {
    return {
      path: normalizedPath,
      hash: EMPTY_HASH,
    };
  }

  const pathWithBase = join(config.basePath, path);
  let content: Buffer;
  try {
    content = await readFile(pathWithBase);
  } catch (error) {
    throw new Error(`Failed to read file: ${normalizedPath}`, { cause: error });
  }
  return {
    path: normalizedPath,
    hash: hashData(content, config),
  };
}

/** Synchronous version of {@link calculateFileHash}. */
export function calculateFileHashSync(path: string, config: Config): FileHash {
  const normalizedPath = normalizeFilePath(path);
  /** @internal "null" algorithm skips hashing — used for testing only */
  if (config.hashAlgorithm === "null") {
    return {
      path: normalizedPath,
      hash: EMPTY_HASH,
    };
  }

  const pathWithBase = join(config.basePath, path);
  let content: Buffer;
  try {
    content = readFileSync(pathWithBase);
  } catch (error) {
    throw new Error(`Failed to read file: ${normalizedPath}`, { cause: error });
  }
  return {
    path: normalizedPath,
    hash: hashData(content, config),
  };
}
