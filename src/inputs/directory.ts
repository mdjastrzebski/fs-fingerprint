import { readdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import type { FingerprintConfig, FingerprintDirectoryHash } from "../types.js";
import { isExcludedPath, mergeHashes, normalizeDirPath } from "../utils.js";
import { calculateFileHash, calculateFileHashSync } from "./file.js";

export async function calculateDirectoryHash(
  path: string,
  config: FingerprintConfig
): Promise<FingerprintDirectoryHash | null> {
  if (isExcludedPath(path, config)) {
    return null;
  }

  const pathWithRoot = join(config.rootDir, path);
  const entries = await readdir(pathWithRoot, { withFileTypes: true });
  const entryHashes = await Promise.all(
    entries.map((entry) => {
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
  );

  const normalizedPath = normalizeDirPath(path);
  const merged = mergeHashes(
    entryHashes.filter((hash) => hash != null),
    config
  );
  if (merged == null) {
    return null;
  }

  return {
    type: "directory",
    key: `directory:${normalizedPath}`,
    hash: merged.hash,
    path: normalizedPath,
    children: merged.inputs,
  };
}

export function calculateDirectoryHashSync(
  path: string,
  config: FingerprintConfig
): FingerprintDirectoryHash | null {
  if (isExcludedPath(path, config)) {
    return null;
  }

  const pathWithRoot = join(config.rootDir, path);
  const entries = readdirSync(pathWithRoot, { withFileTypes: true });
  const entryHashes = entries
    .map((entry) => {
      if (entry.isFile()) {
        const filePath = join(path, entry.name);
        return calculateFileHashSync(filePath, config);
      } else if (entry.isDirectory()) {
        const dirPath = join(path, entry.name);
        return calculateDirectoryHashSync(dirPath, config);
      } else {
        console.warn(`fs-fingerprint: skipping ${entry.name} in ${path}`);
        return null;
      }
    })
    .filter((entry) => entry != null);

  const normalizedPath = normalizeDirPath(path);
  const merged = mergeHashes(entryHashes, config);
  if (merged == null) {
    return null;
  }

  return {
    type: "directory",
    key: `directory:${normalizedPath}`,
    hash: merged.hash,
    path: normalizedPath,
    children: merged.inputs,
  };
}
