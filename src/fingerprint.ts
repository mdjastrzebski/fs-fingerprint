import { readdirSync } from "node:fs";

import { calculateContentHash } from "./inputs/content.js";
import { calculateDirectoryHash } from "./inputs/directory.js";
import { calculateFileHash } from "./inputs/file.js";
import { calculateJsonHash } from "./inputs/json.js";
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
      const hash = calculateFileHash(entryPath, config);
      if (hash !== null) {
        inputHashes.push(hash);
      }
    } else if (entry.isDirectory()) {
      const hash = calculateDirectoryHash(entryPath, config);
      if (hash !== null) {
        inputHashes.push(hash);
      }
    }
  }

  // Process extraInputs (content and json inputs)
  if (options?.extraInputs) {
    for (const input of options.extraInputs) {
      let hash: FingerprintInputHash;

      if ("content" in input) {
        hash = calculateContentHash(input, config);
      } else if ("json" in input) {
        hash = calculateJsonHash(input, config);
      } else {
        throw new Error(`Unsupported extraInput type: ${JSON.stringify(input, null, 2)}`);
      }

      inputHashes.push(hash);
    }
  }

  return mergeInputHashes(config, inputHashes);
}
