import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { EMPTY_HASH } from "../constants.js";
import type { FingerprintConfig, FingerprintFileHash } from "../types.js";
import { hashContent, normalizeFilePath } from "../utils.js";

const noopWrapper = async (fn: () => PromiseLike<string>) => fn();

export async function calculateFileHash(
  path: string,
  config: FingerprintConfig,
): Promise<FingerprintFileHash | null> {
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
): FingerprintFileHash | null {
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
