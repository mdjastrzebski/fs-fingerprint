import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { FingerprintConfig, FingerprintFileHash, FingerprintFileInput } from "../types.js";
import { hashContent, matchesAnyPattern } from "../utils.js";

export function fileInput(path: string): FingerprintFileInput {
  return {
    type: "file",
    key: `file:${path}`,
    path,
  };
}

export function hashFile(
  config: FingerprintConfig,
  input: FingerprintFileInput
): FingerprintFileHash | null {
  if (matchesAnyPattern(input.path, config.exclude)) {
    return null;
  }

  const pathWithRoot = join(config.rootDir, input.path);
  const content = readFileSync(pathWithRoot, "utf8");
  return {
    ...input,
    hash: hashContent(config, content),
  };
}
