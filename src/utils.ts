import { createHash } from "node:crypto";
import { escapePath, glob, globSync } from "tinyglobby";

import { DEFAULT_HASH_ALGORITHM, EMPTY_HASH } from "./constants.js";
import type { FingerprintConfig, FingerprintInputHash, FingerprintResult } from "./types.js";
import { execSync } from "node:child_process";

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
};

export async function generateFileList({
  rootDir,
  include = ["**"],
  exclude,
  excludeFn,
}: GenerateFileListOptions): Promise<string[]> {
  const paths = await glob(include, {
    cwd: rootDir,
    ignore: exclude,
    expandDirectories: true,
  });

  const result = excludeFn ? paths.filter((p) => !excludeFn(p)) : paths;
  result.sort();
  return result;
}

export function generateFileListSync({
  rootDir,
  include = ["**"],
  exclude,
  excludeFn,
}: GenerateFileListOptions): string[] {
  const paths = globSync(include, {
    cwd: rootDir,
    ignore: exclude,
    expandDirectories: true,
  });

  const result = excludeFn ? paths.filter((p) => !excludeFn(p)) : paths;
  result.sort();
  return result;
}

export function listGitIgnoredFiles(cwd: string): string[] {
  const output = execSync("git ls-files --others --ignored --exclude-standard --directory", {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return output
    .split("\n")
    .filter(Boolean)
    .map((p) => escapePath(p));
}
