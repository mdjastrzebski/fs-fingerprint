import { readdirSync } from "node:fs";
import { join } from "node:path";

import { EMPTY_HASH } from "../constants.js";
import type {
  FingerprintConfig,
  FingerprintDirectoryHash,
  FingerprintDirectoryInput,
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
): FingerprintDirectoryHash | null {
  const pathWithRoot = join(config.rootDir, input.path);
  if (matchesAnyPattern(input.path, config.exclude)) {
    return null;
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
    .filter((entry) => entry != null);

  if (entryHashes.length === 0) {
    return { ...input, hash: EMPTY_HASH, children: [] };
  }

  const merged = mergeInputHashes(config, entryHashes);
  return {
    ...input,
    hash: merged.hash,
    children: merged.inputs,
  };
}
