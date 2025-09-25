import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { EMPTY_HASH } from "../constants.js";
import type { Config, FileHash } from "../types.js";
import { hashContent, normalizeFilePath } from "../utils.js";

export async function calculateFileHash(path: string, config: Config): Promise<FileHash> {
  const normalizedPath = normalizeFilePath(path);
  if (config.hashAlgorithm === "null") {
    return {
      path: normalizedPath,
      hash: EMPTY_HASH,
    };
  }

  const pathWithRoot = join(config.rootDir, path);
  const content = await readFile(pathWithRoot, "utf8");
  return {
    path: normalizedPath,
    hash: hashContent(content, config),
  };
}

export function calculateFileHashSync(path: string, config: Config): FileHash {
  const normalizedPath = normalizeFilePath(path);
  if (config.hashAlgorithm === "null") {
    return {
      path: normalizedPath,
      hash: EMPTY_HASH,
    };
  }

  const pathWithRoot = join(config.rootDir, path);
  const content = readFileSync(pathWithRoot, "utf8");
  return {
    path: normalizedPath,
    hash: hashContent(content, config),
  };
}
