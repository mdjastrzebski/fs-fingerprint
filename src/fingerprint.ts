import { readdirSync } from "node:fs";

import { hashContentSource } from "./sources/content.js";
import { directorySource, hashDirectorySource } from "./sources/directory.js";
import { fileSource, hashFile } from "./sources/file.js";
import type { FingerprintHash, FingerprintOptions, FingerprintSourceHash } from "./types.js";
import { matchesAnyPattern, mergeSourceHashes } from "./utils.js";

export function calculateFingerprint(
  rootDir: string,
  options?: FingerprintOptions
): FingerprintHash {
  const config = {
    rootDir,
    exclude: options?.exclude,
    hashAlgorithm: options?.hashAlgorithm,
  };

  const sourceHashes: FingerprintSourceHash[] = [];

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
      const hash = hashFile(config, fileSource(entryPath));
      if (hash.hash !== null) {
        sourceHashes.push(hash);
      }
    } else if (entry.isDirectory()) {
      const hash = hashDirectorySource(config, directorySource(entryPath));
      if (hash.hash !== null) {
        sourceHashes.push(hash);
      }
    }
  }

  // Process extraSources (content sources)
  if (options?.extraSources) {
    for (const extraSource of options.extraSources) {
      const hash = hashContentSource(config, extraSource);
      sourceHashes.push(hash);
    }
  }

  return mergeSourceHashes(config, sourceHashes);
}
