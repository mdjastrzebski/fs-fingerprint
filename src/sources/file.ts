import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { FingerprintConfig, FingerprintFileSource, FingerprintSourceHash } from "../types.js";
import { hashContent, matchesIgnorePath } from "../utils.js";

export function fileSource(path: string): FingerprintFileSource {
  return {
    type: "file",
    key: `file:${path}`,
    path,
  };
}

export function hashFileSource(
  config: FingerprintConfig,
  source: FingerprintFileSource
): FingerprintSourceHash {
  const pathWithRoot = join(config.rootDir, source.path);
  if (matchesIgnorePath(source.path, config.ignorePaths)) {
    return { source, hash: null };
  }

  const content = readFileSync(pathWithRoot, "utf8");
  return {
    source,
    hash: hashContent(config, content),
  };
}
