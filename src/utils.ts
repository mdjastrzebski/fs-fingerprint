import { createHash } from "node:crypto";
import { glob, globSync } from "tinyglobby";

import { DEFAULT_HASH_ALGORITHM, EMPTY_HASH } from "./constants.js";
import type { Config, ContentHash, FileHash, Fingerprint } from "./types.js";

export function hashData(content: string | Uint8Array, config: Config) {
  if (config.hashAlgorithm === "null") {
    return EMPTY_HASH;
  }

  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  hasher.update(content);
  return hasher.digest("hex");
}

export function mergeHashes(
  fileHashes: readonly FileHash[],
  contentHashes: readonly ContentHash[],
  config: Config,
): Fingerprint {
  const sortedFileHashes = sortBy([...fileHashes], (h) => h.path);
  const sortedContentHashes = sortBy([...contentHashes], (h) => h.key);
  if (config.hashAlgorithm === "null") {
    return {
      hash: EMPTY_HASH,
      files: sortedFileHashes,
      content: sortedContentHashes,
    };
  }

  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  for (const file of sortedFileHashes) {
    hasher.update(file.path);
    hasher.update("\0");
    hasher.update(file.hash);
    hasher.update("\0\0");
  }

  hasher.update("\0\0");

  for (const entry of sortedContentHashes) {
    hasher.update(entry.key);
    hasher.update("\0");
    hasher.update(entry.hash);
    hasher.update("\0\0");
  }

  return {
    hash: hasher.digest("hex"),
    files: sortedFileHashes,
    content: sortedContentHashes,
  };
}

export type GetInputFilesOptions = {
  files?: readonly string[];
  ignores?: readonly string[];
};

export async function getInputFiles(
  basePath: string,
  { files = ["**"], ignores }: GetInputFilesOptions,
): Promise<string[]> {
  const paths = await glob(files, {
    cwd: basePath,
    ignore: ignores,
    expandDirectories: true,
  });

  paths.sort();
  return paths;
}

export function getInputFilesSync(
  basePath: string,
  { files = ["**"], ignores }: GetInputFilesOptions,
): string[] {
  const paths = globSync(files, {
    cwd: basePath,
    ignore: ignores,
    expandDirectories: true,
  });

  paths.sort();
  return paths;
}

export function normalizeFilePath(path: string): string {
  return path.startsWith("./") ? path.slice(2) : path;
}

export function sortBy<T>(list: T[], selector: (item: T) => string): T[] {
  return list.sort((a, b) => {
    const aKey = selector(a);
    const bKey = selector(b);
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });
}
