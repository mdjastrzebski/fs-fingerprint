import { readdirSync } from "node:fs";
import { join } from "node:path";

import type { FingerprintConfig, FingerprintDirectoryHash } from "../types.js";
import { matchesAnyPattern, mergeInputHashes } from "../utils.js";
import { calculateFileHash } from "./file.js";

export function calculateDirectoryHash(
  path: string,
  config: FingerprintConfig
): FingerprintDirectoryHash | null {
  const pathWithRoot = join(config.rootDir, path);
  if (matchesAnyPattern(path, config.exclude)) {
    return null;
  }

  const entries = readdirSync(pathWithRoot, { withFileTypes: true });
  const entryHashes = entries
    .map((entry) => {
      if (entry.isFile()) {
        const filePath = join(path, entry.name);
        return calculateFileHash(filePath, config);
      } else if (entry.isDirectory()) {
        const dirPath = join(path, entry.name);
        return calculateDirectoryHash(dirPath, config);
      } else {
        console.warn(`fs-fingerprint: skipping ${entry.name} in ${path}`);
        return null;
      }
    })
    .filter((entry) => entry != null);

  const merged = mergeInputHashes(config, entryHashes);
  return {
    type: "directory",
    key: `directory:${path}`,
    hash: merged.hash,
    path,
    children: merged.inputs,
  };
}
