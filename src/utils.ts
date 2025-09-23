import { createHash } from "node:crypto";
import * as nodePath from "node:path";
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

export async function getFilesToHash({
  rootDir,
  include = ["**"],
  exclude,
}: GenerateFileListOptions): Promise<string[]> {
  const paths = await glob(include, {
    cwd: rootDir,
    ignore: exclude,
    expandDirectories: true,
  });

  paths.sort();
  return paths;
}

export function getFilesToHashSync({
  rootDir,
  include = ["**"],
  exclude,
}: GenerateFileListOptions): string[] {
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

type GenerateFileListOptions = {
  rootDir: string;
  include?: string[];
  exclude?: string[];
};

export function getEffectiveRootDir(rootDir: string, include?: string[]): string {
  const maxEscapeLevel = include?.map(extractEscapeLevel).reduce((a, b) => Math.max(a, b), 0) ?? 0;
  if (maxEscapeLevel === 0) {
    return rootDir || process.cwd();
  }

  return nodePath.resolve(rootDir, ...Array(maxEscapeLevel).fill(".."));
}

function extractEscapeLevel(path: string): number {
  let level = 0;
  while (path.startsWith("../")) {
    level++;
    path = path.slice(3);
  }
  return level;
}

export function remapPaths(path: string, fromRoot: string, toRoot: string): string {
  console.log("Remapping path:", { path, fromRoot, toRoot });
  const rootDiff = nodePath.relative(toRoot, fromRoot);
  console.log("Root diff:", rootDiff);
  return nodePath.normalize(nodePath.join(rootDiff, path));
}
