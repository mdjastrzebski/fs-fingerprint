import * as console from "node:console";
import { type Dirent, readdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import pLimit from "p-limit";

import { calculateContentHash } from "./inputs/content.js";
import { calculateDirectoryHash, calculateDirectoryHashSync } from "./inputs/directory.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import { calculateJsonHash } from "./inputs/json.js";
import type { FingerprintConfig, FingerprintInputHash, FingerprintOptions, FingerprintResult } from "./types.js";
import { matchesAnyPattern, mergeHashes } from "./utils.js";

const DEFAULT_CONCURRENCY = 16;

export async function calculateFingerprint(
  rootDir: string,
  options?: FingerprintOptions
): Promise<FingerprintResult> {
  const config: FingerprintConfig = {
    rootDir,
    exclude: options?.exclude,
    hashAlgorithm: options?.hashAlgorithm,
    asyncWrapper: pLimit(options?.maxConcurrency ?? DEFAULT_CONCURRENCY)
  };
  
  console.warn("💡 options", options);

  const inputHashes: FingerprintInputHash[] = [];

  // Process top-level entries in rootDir
  const entries = await readdir(rootDir, { withFileTypes: true });

  console.warn("entries", entries, options?.include);
  const entryHashes = await Promise.all(entries.map(
    entry => calculateEntryHash(entry, options?.include, config)
  ));
  inputHashes.push(...entryHashes.filter(hash => hash != null));

  // Process extraInputs (content and json inputs)
  if (options?.extraInputs) {
    for (const input of options.extraInputs) {
      let hash: FingerprintInputHash;

      if ("content" in input) {
        hash = calculateContentHash(input, config);
      } else if ("json" in input) {
        hash = calculateJsonHash(input, config);
      } else {
        throw new Error(`Unsupported input type: ${JSON.stringify(input, null, 2)}`);
      }

      inputHashes.push(hash);
    }
  }

  return mergeHashes(inputHashes, config);
}



async function calculateEntryHash(entry: Dirent, include: readonly string[] | undefined, config: FingerprintConfig): Promise<FingerprintInputHash | null> {
  const shouldBeIncluded = !include || matchesAnyPattern(entry.name, include);
  if (!shouldBeIncluded) {
    return null;
  }
  
  const entryPath = entry.name;
  const shouldBeExcluded = matchesAnyPattern(entryPath, config.exclude);
  console.warn("shouldBeExcluded", entryPath, config.exclude, matchesAnyPattern(entryPath, config.exclude));
  if (shouldBeExcluded) {
    return null;
  }

  if (entry.isFile()) {
    const r = await calculateFileHash(entryPath, config);
    console.warn("file", r);
    return r;
  } else if (entry.isDirectory()) {
    console.warn("isDirectory", entryPath);
    const r = await calculateDirectoryHash(entryPath, config);
    console.warn("dir", r);
    return r;
  } else {
    console.warn(`fs-fingerprint: skipping ${entry.name} in ${entryPath}`);
    return null;
  }
}

export function calculateFingerprintSync(
  rootDir: string,
  options?: FingerprintOptions
): FingerprintResult {
  const config = {
    rootDir,
    include: options?.include,
    exclude: options?.exclude,
    hashAlgorithm: options?.hashAlgorithm,
  };

  const inputHashes: FingerprintInputHash[] = [];

  // Process top-level entries in rootDir
  const entries = readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = entry.name;

    const shouldBeIncluded = !options?.include || matchesAnyPattern(entryPath, options?.include);
    if (!shouldBeIncluded) {
      continue;
    }

    const shouldBeExcluded = matchesAnyPattern(entryPath, options?.exclude);
    if (shouldBeExcluded) {
      continue;
    }

    if (entry.isFile()) {
      const hash = calculateFileHashSync(entryPath, config);
      if (hash !== null) {
        inputHashes.push(hash);
      }
    } else if (entry.isDirectory()) {
      const hash = calculateDirectoryHashSync(entryPath, config);
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
        throw new Error(`Unsupported input type: ${JSON.stringify(input, null, 2)}`);
      }

      inputHashes.push(hash);
    }
  }

  return mergeHashes(inputHashes, config);
}
