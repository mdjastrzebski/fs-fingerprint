import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { FingerprintConfig, FingerprintFileHash } from "../types.js";
import { hashContent, matchesAnyPattern } from "../utils.js";

export function hashFile(path: string, config: FingerprintConfig): FingerprintFileHash | null {
  if (matchesAnyPattern(path, config.exclude)) {
    return null;
  }

  const pathWithRoot = join(config.rootDir, path);
  const content = readFileSync(pathWithRoot, "utf8");
  return {
    type: "file",
    key: `file:${path}`,
    path,
    hash: hashContent(config, content),
  };
}
