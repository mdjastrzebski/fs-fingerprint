import { readdirSync } from "node:fs";
import { join } from "node:path";

import type {
  FingerprintConfig,
  FingerprintDirectoryInput,
  FingerprintInputHash,
} from "../types.js";
import { matchesAnyPattern, mergeInputHashes } from "../utils.js";
import { fileInput, hashFile } from "./file.js";

export function directoryInput(path: string): FingerprintDirectoryInput {
  return {
    type: "directory",
    key: `directory:${path}`,
    path,
  };
}

export function hashDirectoryInput(
  config: FingerprintConfig,
  input: FingerprintDirectoryInput
): FingerprintInputHash {
  const pathWithRoot = join(config.rootDir, input.path);
  if (matchesAnyPattern(input.path, config.exclude)) {
    return { input, hash: null, children: [] };
  }

  const entries = readdirSync(pathWithRoot, { withFileTypes: true });
  const entryHashes = entries
    .map((entry) => {
      if (entry.isFile()) {
        const filePath = join(input.path, entry.name);
        return hashFile(config, fileInput(filePath));
      } else if (entry.isDirectory()) {
        const dirPath = join(input.path, entry.name);
        return hashDirectoryInput(config, directoryInput(dirPath));
      } else {
        console.warn(`fs-fingerprint: skipping ${entry.name} in ${input.path}`);
        return null;
      }
    })
    .filter((entry) => entry != null)
    .filter((entry) => entry.hash != null);

  if (entryHashes.length === 0) {
    return { input, hash: null, children: [] };
  }

  const merged = mergeInputHashes(config, entryHashes);
  return {
    input,
    hash: merged.hash,
    children: merged.inputs,
  };
}
