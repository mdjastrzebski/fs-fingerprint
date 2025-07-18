import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EMPTY_HASH } from "../constants.js";
import type { FingerprintConfig, FingerprintFileHash } from "../types.js";
import { hashContent, matchesAnyPattern } from "../utils.js";

export function calculateFileHash(
  path: string,
  config: FingerprintConfig
): FingerprintFileHash | null {
  if (matchesAnyPattern(path, config.exclude)) {
    return null;
  }

  if (config.hashAlgorithm === "null") {
    return {
      type: "file",
      key: `file:${path}`,
      hash: EMPTY_HASH,
      path,
    };
  }

  const pathWithRoot = join(config.rootDir, path);
  const content = readFileSync(pathWithRoot, "utf8");
  return {
    type: "file",
    key: `file:${path}`,
    hash: hashContent(content, config),
    path,
  };
}
