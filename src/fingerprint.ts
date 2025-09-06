import * as console from "node:console";
import { type Dirent, readdirSync, readFileSync, type Stats, statSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import * as path from "node:path";
import ignore, { type Ignore } from "ignore";
import pLimit from "p-limit";

import { calculateContentHash } from "./inputs/content.js";
import { calculateDirectoryHash, calculateDirectoryHashSync } from "./inputs/directory.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import { calculateJsonHash } from "./inputs/json.js";
import type {
  FingerprintConfig,
  FingerprintInputHash,
  FingerprintOptions,
  FingerprintResult,
} from "./types.js";
import { isExcludedPath, mergeHashes } from "./utils.js";

const DEFAULT_CONCURRENCY = 16;

export async function calculateFingerprint(
  rootDir: string,
  options?: FingerprintOptions
): Promise<FingerprintResult> {
  const config: FingerprintConfig = {
    rootDir,
    exclude: options?.exclude,
    hashAlgorithm: options?.hashAlgorithm,
    ignoreObject: buildIgnoreObject(rootDir, options?.ignoreFilePath),
    asyncWrapper: pLimit(options?.maxConcurrent ?? DEFAULT_CONCURRENCY),
  };

  const inputHashes: FingerprintInputHash[] = [];

  // Process top-level entries in rootDir
  if (options?.include) {
    const entryHashes = await Promise.all(
      options.include.map((path) => calculateEntryHashForPath(path, config))
    );
    inputHashes.push(...entryHashes.filter((hash) => hash != null));
  } else {
    const entries = await readdir(rootDir, { withFileTypes: true });
    const entryHashes = await Promise.all(
      entries.map((entry) => calculateEntryHashForDirent(entry, config))
    );
    inputHashes.push(...entryHashes.filter((hash) => hash != null));
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

async function calculateEntryHashForDirent(
  entry: Dirent,
  config: FingerprintConfig
): Promise<FingerprintInputHash | null> {
  if (isExcludedPath(entry.name, config)) {
    return null;
  }

  if (entry.isFile()) {
    return calculateFileHash(entry.name, config);
  } else if (entry.isDirectory()) {
    return calculateDirectoryHash(entry.name, config);
  } else {
    console.warn(`fs-fingerprint: skipping ${entry.name} (not a file or directory)`);
    return null;
  }
}

async function calculateEntryHashForPath(
  entryPath: string,
  config: FingerprintConfig
): Promise<FingerprintInputHash | null> {
  if (isExcludedPath(entryPath, config)) {
    return null;
  }

  const fullPath = path.join(config.rootDir, entryPath);
  let entry: Stats;
  try {
    entry = await stat(fullPath);
  } catch {
    console.warn(`fs-fingerprint: skipping ${entryPath} (not exists)`);
    return null;
  }

  if (entry.isFile()) {
    return calculateFileHash(entryPath, config);
  } else if (entry.isDirectory()) {
    return calculateDirectoryHash(entryPath, config);
  } else {
    console.warn(`fs-fingerprint: skipping ${entryPath} (not a file or directory)`);
    return null;
  }
}

export function calculateFingerprintSync(
  rootDir: string,
  options?: FingerprintOptions
): FingerprintResult {
  const config: FingerprintConfig = {
    rootDir,
    exclude: options?.exclude,
    hashAlgorithm: options?.hashAlgorithm,
    ignoreObject: buildIgnoreObject(rootDir, options?.ignoreFilePath),
  };

  const inputHashes: FingerprintInputHash[] = [];

  if (options?.include) {
    for (const entryPath of options.include) {
      const hash = calculateEntryHashForPathSync(entryPath, config);
      if (hash !== null) {
        inputHashes.push(hash);
      }
    }
  } else {
    const entries = readdirSync(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      const hash = calculateEntryHashForDirentSync(entry, config);
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

function calculateEntryHashForPathSync(
  entryPath: string,
  config: FingerprintConfig
): FingerprintInputHash | null {
  if (isExcludedPath(entryPath, config)) {
    return null;
  }

  const fullPath = path.join(config.rootDir, entryPath);
  let entry: Stats;
  try {
    entry = statSync(fullPath);
  } catch {
    console.warn(`fs-fingerprint: skipping ${entryPath} (not exists)`);
    return null;
  }

  if (entry.isFile()) {
    return calculateFileHashSync(entryPath, config);
  } else if (entry.isDirectory()) {
    return calculateDirectoryHashSync(entryPath, config);
  } else {
    console.warn(`fs-fingerprint: skipping ${entryPath} (not a file or directory)`);
    return null;
  }
}

function calculateEntryHashForDirentSync(
  entry: Dirent,
  config: FingerprintConfig
): FingerprintInputHash | null {
  const entryPath = entry.name;
  if (isExcludedPath(entryPath, config)) {
    return null;
  }

  if (entry.isFile()) {
    const hash = calculateFileHashSync(entryPath, config);
    return hash;
  } else if (entry.isDirectory()) {
    const hash = calculateDirectoryHashSync(entryPath, config);
    return hash;
  } else {
    console.warn(`fs-fingerprint: skipping ${entryPath} (not a file or directory)`);
    return null;
  }
}

function buildIgnoreObject(rootDir: string, gitIgnorePath: string | undefined): Ignore | null {
  if (gitIgnorePath == null) {
    return null;
  }

  const rules = readFileSync(path.join(rootDir, gitIgnorePath), "utf8")
  return ignore().add(rules);
}