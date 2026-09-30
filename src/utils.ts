import { createHash } from "node:crypto";
import { glob, globSync } from "tinyglobby";

import { DEFAULT_HASH_ALGORITHM, NULL_HASH } from "./constants.js";
import type { Config, ContentHash, FileHash, Fingerprint } from "./types.js";

/** Hashes string or binary data using the configured algorithm. */
export function hashData(content: string | Uint8Array, config: Config) {
  /** @internal "null" algorithm skips hashing — used for testing only */
  if (config.hashAlgorithm === "null") {
    return NULL_HASH;
  }

  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  hasher.update(content);
  return hasher.digest("hex");
}

/** Combines sorted file and content hashes into a single {@link Fingerprint}. */
export function mergeHashes(
  fileHashes: readonly FileHash[],
  contentHashes: readonly ContentHash[],
  config: Config,
): Fingerprint {
  const sortedFileHashes = sortBy([...fileHashes], (h) => h.path);
  const sortedContentHashes = sortBy([...contentHashes], (h) => h.key);
  /** @internal "null" algorithm skips hashing — used for testing only */
  if (config.hashAlgorithm === "null") {
    return {
      hash: NULL_HASH,
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

/** Discovers files matching the given glob patterns, returned sorted. */
export async function getInputFiles(
  basePath: string,
  { files = ["**"], ignores }: GetInputFilesOptions,
): Promise<string[]> {
  const paths = await glob(files, getGlobOptions(basePath, files, ignores));

  paths.sort();
  return paths;
}

/** Synchronous version of {@link getInputFiles}. */
export function getInputFilesSync(
  basePath: string,
  { files = ["**"], ignores }: GetInputFilesOptions,
): string[] {
  const paths = globSync(files, getGlobOptions(basePath, files, ignores));

  paths.sort();
  return paths;
}

function getGlobOptions(basePath: string, files: readonly string[], ignores?: readonly string[]) {
  return {
    cwd: basePath,
    ignore: [...getGitMetadataIgnores(files), ...(ignores ?? [])],
    dot: true,
    expandDirectories: true,
  };
}

/**
 * Ignore patterns for `.git` entries (directory, or file in worktrees and submodules) at any depth.
 * `**` does not match `../` segments, so each `../` prefix used in `files` gets its own pattern.
 */
function getGitMetadataIgnores(files: readonly string[]): string[] {
  const prefixes = new Set([""]);
  for (const pattern of files) {
    const prefix = /^(?:\.\.\/)+/.exec(pattern)?.[0];
    if (prefix) {
      prefixes.add(prefix);
    }
  }

  return [...prefixes].map((prefix) => `${prefix}**/.git`);
}

/** Strips a leading `./` prefix from a file path. */
export function normalizeFilePath(path: string): string {
  return path.startsWith("./") ? path.slice(2) : path;
}

/** Sorts an array in place by a string key derived from each element. */
export function sortBy<T>(list: T[], selector: (item: T) => string): T[] {
  return list.sort((a, b) => {
    const aKey = selector(a);
    const bKey = selector(b);
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });
}
