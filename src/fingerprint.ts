import { readdirSync } from "node:fs";

import { hashContentSource } from "./sources/content.js";
import { directorySource, hashDirectorySource } from "./sources/directory.js";
import { fileSource, hashFileSource } from "./sources/file.js";
import type { FingerprintArgs, FingerprintHash, FingerprintSourceHash } from "./types.js";
import { matchesExcludePath, matchesIncludePath, mergeSourceHashes } from "./utils.js";

export function calculateFingerprint(args: FingerprintArgs): FingerprintHash {
  const config = {
    rootDir: args.rootDir,
    excludes: args.excludes,
    hashAlgorithm: args.hashAlgorithm,
  };

  const sourceHashes: FingerprintSourceHash[] = [];

  // Process top-level entries in rootDir
  const entries = readdirSync(args.rootDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const entryPath = entry.name;
    
    // Skip if doesn't match includes pattern
    if (!matchesIncludePath(entryPath, args.includes)) {
      continue;
    }
    
    // Skip if matches excludes pattern
    if (matchesExcludePath(entryPath, args.excludes)) {
      continue;
    }
    
    if (entry.isFile()) {
      const hash = hashFileSource(config, fileSource(entryPath));
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
  if (args.extraSources) {
    for (const extraSource of args.extraSources) {
      const hash = hashContentSource(config, extraSource);
      sourceHashes.push(hash);
    }
  }

  return mergeSourceHashes(config, sourceHashes);
}
