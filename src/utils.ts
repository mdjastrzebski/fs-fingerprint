import { createHash } from "node:crypto";
import { glob, globSync } from "tinyglobby";

import { DEFAULT_HASH_ALGORITHM, EMPTY_HASH } from "./constants.js";
import type { Config, ContentHash, FileHash, Fingerprint } from "./types.js";

export function hashContent(content: string | Uint8Array, config: Config) {
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
  const sortedFileHashes = [...fileHashes].sort((a, b) => a.path.localeCompare(b.path));
  const sortedContentHashes = [...contentHashes].sort((a, b) => a.key.localeCompare(b.key));
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
  rootDir: string;
  include?: readonly string[];
  exclude?: readonly string[];
};

export async function getInputFiles({
  rootDir,
  include = ["**"],
  exclude,
}: GetInputFilesOptions): Promise<string[]> {
  const paths = await glob(include, {
    cwd: rootDir,
    ignore: exclude,
    expandDirectories: true,
  });

  paths.sort();
  return paths;
}

export function getInputFilesSync({
  rootDir,
  include = ["**"],
  exclude,
}: GetInputFilesOptions): string[] {
  const paths = globSync(include, {
    cwd: rootDir,
    ignore: exclude,
    expandDirectories: true,
  });

  paths.sort();
  return paths;
}

export function normalizeFilePath(path: string): string {
  return path.startsWith("./") ? path.slice(2) : path;
}
