import { createHash } from "node:crypto";
import * as nodePath from "node:path";
import { glob, globSync } from "tinyglobby";

import { DEFAULT_HASH_ALGORITHM, EMPTY_HASH } from "./constants.js";
import type { FileHash, Fingerprint, FingerprintConfig, FingerprintInputHash } from "./types.js";

export function hashContent(content: string, config: FingerprintConfig) {
  if (config.hashAlgorithm === "null") {
    return EMPTY_HASH;
  }

  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  hasher.update(content);
  return hasher.digest("hex");
}

export function mergeHashes(
  fileHashes: readonly FileHash[],
  inputHashes: readonly FingerprintInputHash[],
  config: FingerprintConfig,
): Fingerprint {
  const sortedFileHashes = [...fileHashes].sort((a, b) => a.path.localeCompare(b.path));
  const sortedInputHashes = [...inputHashes].sort((a, b) => a.key.localeCompare(b.key));
  if (config.hashAlgorithm === "null") {
    return {
      hash: EMPTY_HASH,
      files: sortedFileHashes,
      inputs: sortedInputHashes,
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

  for (const input of sortedInputHashes) {
    hasher.update(input.key);
    hasher.update("\0");
    hasher.update(input.hash);
    hasher.update("\0\0");
  }

  return {
    hash: hasher.digest("hex"),
    files: sortedFileHashes,
    inputs: sortedInputHashes,
  };
}

export type GetInputFilesOptions = {
  rootDir: string;
  include?: string[];
  exclude?: string[];
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

export function remapPaths(path: string, fromRoot: string, toRoot: string): string {
  const rebasedPath = nodePath
    .relative(toRoot, nodePath.join(fromRoot, path))
    .split(nodePath.sep)
    .join("/");
  if (path.endsWith("/") && !rebasedPath.endsWith("/")) {
    return `${rebasedPath}/`;
  }

  return rebasedPath;
}
