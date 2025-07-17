import { readdirSync } from "node:fs";
import { join } from "node:path";

import type {
  FingerprintConfig,
  FingerprintDirectorySource,
  FingerprintSourceHash,
} from "../types.js";
import { matchesExcludePath, mergeSourceHashes } from "../utils.js";
import { fileSource, hashFileSource } from "./file.js";

export function directorySource(path: string): FingerprintDirectorySource {
  return {
    type: "directory",
    key: `directory:${path}`,
    path,
  };
}

export function hashDirectorySource(
  config: FingerprintConfig,
  source: FingerprintDirectorySource
): FingerprintSourceHash {
  const pathWithRoot = join(config.rootDir, source.path);
  if (matchesExcludePath(source.path, config.exclude)) {
    return { source, hash: null, children: [] };
  }

  const entries = readdirSync(pathWithRoot, { withFileTypes: true });
  const entryHashes = entries
    .map((entry) => {
      if (entry.isFile()) {
        const filePath = join(source.path, entry.name);
        return hashFileSource(config, fileSource(filePath));
      } else if (entry.isDirectory()) {
        const dirPath = join(source.path, entry.name);
        return hashDirectorySource(config, directorySource(dirPath));
      } else {
        console.warn(`fs-fingerprint: skipping ${entry.name} in ${source.path}`);
        return null;
      }
    })
    .filter((entry) => entry != null)
    .filter((entry) => entry.hash != null);

  if (entryHashes.length === 0) {
    return { source, hash: null, children: [] };
  }

  const merged = mergeSourceHashes(config, entryHashes);
  return {
    source,
    hash: merged.hash,
    children: merged.sources,
  };
}
