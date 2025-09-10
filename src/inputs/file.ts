import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { EMPTY_HASH } from "../constants.js";
import type { FingerprintConfig, FingerprintFileHash } from "../types.js";
import { hashContent, isExcludedPath, normalizeFilePath } from "../utils.js";

const noopWrapper = async (fn: () => PromiseLike<string>) => fn();

type CalculateFileHashOptions = {
  /** Skip exclude for initial path, but handle it normally for subdirectories */
  skipInitialExclude?: boolean;
};

export async function calculateFileHash(
  path: string,
  config: FingerprintConfig,
  options?: CalculateFileHashOptions,
): Promise<FingerprintFileHash | null> {
  if (!options?.skipInitialExclude && isExcludedPath(path, config)) {
    return null;
  }

  const normalizedPath = normalizeFilePath(path);

  if (config.hashAlgorithm === "null") {
    return {
      type: "file",
      key: `file:${normalizedPath}`,
      hash: EMPTY_HASH,
      path: normalizedPath,
    };
  }

  const asyncWrapper = config.asyncWrapper ?? noopWrapper;

  const pathWithRoot = join(config.rootDir, path);
  const content = await asyncWrapper(() => readFile(pathWithRoot, "utf8"));
  return {
    type: "file",
    key: `file:${normalizedPath}`,
    hash: hashContent(content, config),
    path: normalizedPath,
  };
}

export function calculateFileHashSync(
  path: string,
  config: FingerprintConfig,
  options?: CalculateFileHashOptions,
): FingerprintFileHash | null {
  if (!options?.skipInitialExclude && isExcludedPath(path, config)) {
    return null;
  }

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
