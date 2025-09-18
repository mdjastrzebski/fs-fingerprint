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

export function normalizeFilePath(path: string): string {
  return path.startsWith("./") ? path.slice(2) : path;
}

type GenerateFileListOptions = {
  rootDir: string;
  include?: string[];
  exclude?: string[];
  excludeFn?: (path: string) => boolean;
  concurrency?: number;
};

export async function generateFileList({
  rootDir,
  include = ["*"],
  exclude,
  excludeFn,
  concurrency,
}: GenerateFileListOptions): Promise<string[]> {
  const firstPass = await fastglob(include, {
    cwd: rootDir,
    ignore: exclude,
    onlyFiles: false,
    markDirectories: true,
    concurrency,
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

  const secondPass = await fastglob(Array.from(dirs), {
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

export function generateFileListSync({
  rootDir,
  include = ["*"],
  exclude,
  excludeFn,
}: GenerateFileListOptions): string[] {
  const firstPass = fastglob.sync(include, {
    cwd: rootDir,
    ignore: exclude,
    onlyFiles: false,
    markDirectories: true,
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

  const secondPass = fastglob.sync(Array.from(dirs), {
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
