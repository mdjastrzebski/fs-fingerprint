import { readdirSync } from "node:fs";

import { hashContentInput } from "./inputs/content.js";
import { directoryInput, hashDirectoryInput } from "./inputs/directory.js";
import { fileInput, hashFile } from "./inputs/file.js";
import type { FingerprintInputHash, FingerprintOptions, FingerprintResult } from "./types.js";
import { matchesAnyPattern, mergeInputHashes } from "./utils.js";

export function calculateFingerprint(
  rootDir: string,
  options?: FingerprintOptions
): FingerprintResult {
  const config = {
    rootDir,
    exclude: options?.exclude,
    hashAlgorithm: options?.hashAlgorithm,
  };

  const inputHashes: FingerprintInputHash[] = [];

  // Process top-level entries in rootDir
  const entries = readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = entry.name;

    const shouldBeIncluded = !options?.include || matchesAnyPattern(entryPath, options.include);
    if (!shouldBeIncluded) {
      continue;
    }

    const shouldBeExcluded = matchesAnyPattern(entryPath, options?.exclude);
    if (shouldBeExcluded) {
      continue;
    }

    if (entry.isFile()) {
      const hash = hashFile(config, fileInput(entryPath));
      if (hash !== null) {
        inputHashes.push(hash);
      }
    } else if (entry.isDirectory()) {
      const hash = hashDirectoryInput(config, directoryInput(entryPath));
      if (hash !== null) {
        inputHashes.push(hash);
      }
    }
  }

  // Process extraInputs (content inputs)
  if (options?.extraInputs) {
    for (const extraInput of options.extraInputs) {
      const hash = hashContentInput(config, extraInput);
      inputHashes.push(hash);
    }
  }

  return mergeInputHashes(config, inputHashes);
}
