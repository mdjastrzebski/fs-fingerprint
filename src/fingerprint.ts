import { existsSync, readFileSync, type Stats, statSync } from "node:fs";
import { stat } from "node:fs/promises";
import * as path from "node:path";
import ignore, { type Ignore } from "ignore";
import pLimit from "p-limit";
import picomatch from "picomatch";

import { DEFAULT_CONCURRENCY, EMPTY_HASH } from "./constants.js";
import { calculateContentHash } from "./inputs/content.js";
import { calculateDirectoryHash, calculateDirectoryHashSync } from "./inputs/directory.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import { calculateJsonHash } from "./inputs/json.js";
import type {
  FingerprintConfig,
  FingerprintInput,
  FingerprintInputHash,
  FingerprintOptions,
  FingerprintResult,
} from "./types.js";
import { mergeHashes } from "./utils.js";

export async function calculateFingerprint(
  rootDir: string,
  options?: FingerprintOptions,
): Promise<FingerprintResult> {
  const config: FingerprintConfig = {
    rootDir,
    exclude: options?.exclude?.map((pattern) => picomatch(pattern)),
    hashAlgorithm: options?.hashAlgorithm,
    ignoreObject: buildIgnoreObject(rootDir, options?.ignoreFilePath),
    asyncWrapper: pLimit(options?.maxConcurrent ?? DEFAULT_CONCURRENCY),
  };

  const inputHashes: FingerprintInputHash[] = [];

  // Process top-level entries in rootDir
  if (options?.include) {
    const entryHashes = await Promise.all(
      options.include.map((path) => calculateEntryHashForPath(path, config)),
    );
    inputHashes.push(...entryHashes.filter((hash) => hash != null));
  } else {
    const rootDirHash = await calculateDirectoryHash(".", config, { skipInitialExclude: true });
    if (rootDirHash != null) {
      inputHashes.push(...rootDirHash.children);
    }
  }

  if (options?.extraInputs) {
    inputHashes.push(...calculateExtraInputHashes(options.extraInputs, config));
  }

  return mergeHashes(inputHashes, config) ?? { hash: EMPTY_HASH, inputs: [] };
}

async function calculateEntryHashForPath(
  entryPath: string,
  config: FingerprintConfig,
): Promise<FingerprintInputHash | null> {
  const pathWithRoot = path.join(config.rootDir, entryPath);
  let entry: Stats;
  try {
    entry = await stat(pathWithRoot);
  } catch {
    console.warn(`fs-fingerprint: skipping "${entryPath}" (not exists)`);
    return null;
  }

  if (entry.isFile()) {
    return calculateFileHash(entryPath, config, { skipInitialExclude: true });
  } else if (entry.isDirectory()) {
    return calculateDirectoryHash(entryPath, config, { skipInitialExclude: true });
  } else {
    console.warn(`fs-fingerprint: skipping "${entryPath}" (not a file or directory)`);
    return null;
  }
}

export function calculateFingerprintSync(
  rootDir: string,
  options?: FingerprintOptions,
): FingerprintResult {
  const config: FingerprintConfig = {
    rootDir,
    exclude: options?.exclude?.map((pattern) => picomatch(pattern)),
    hashAlgorithm: options?.hashAlgorithm,
    ignoreObject: buildIgnoreObject(rootDir, options?.ignoreFilePath),
  };

  const inputHashes: FingerprintInputHash[] = [];

  if (options?.include) {
    const entryHashes = options.include.map((path) => calculateEntryHashForPathSync(path, config));
    inputHashes.push(...entryHashes.filter((hash) => hash != null));
  } else {
    const rootDirHash = calculateDirectoryHashSync(".", config, { skipInitialExclude: true });
    if (rootDirHash != null) {
      inputHashes.push(...rootDirHash.children);
    }
  }

  if (options?.extraInputs) {
    inputHashes.push(...calculateExtraInputHashes(options.extraInputs, config));
  }

  return mergeHashes(inputHashes, config) ?? { hash: EMPTY_HASH, inputs: [] };
}

function calculateEntryHashForPathSync(
  entryPath: string,
  config: FingerprintConfig,
): FingerprintInputHash | null {
  const pathWithRoot = path.join(config.rootDir, entryPath);
  let entry: Stats;
  try {
    entry = statSync(pathWithRoot);
  } catch {
    console.warn(`fs-fingerprint: skipping "${entryPath}" (not exists)`);
    return null;
  }

  if (entry.isFile()) {
    return calculateFileHashSync(entryPath, config, { skipInitialExclude: true });
  } else if (entry.isDirectory()) {
    return calculateDirectoryHashSync(entryPath, config, { skipInitialExclude: true });
  } else {
    console.warn(`fs-fingerprint: skipping "${entryPath}" (not a file or directory)`);
    return null;
  }
}

function calculateExtraInputHashes(
  inputs: FingerprintInput[],
  config: FingerprintConfig,
): FingerprintInputHash[] {
  const result: FingerprintInputHash[] = [];
  for (const input of inputs) {
    if ("content" in input) {
      result.push(calculateContentHash(input, config));
    } else if ("json" in input) {
      result.push(calculateJsonHash(input, config));
    } else {
      throw new Error(`Unsupported input type: ${JSON.stringify(input, null, 2)}`);
    }
  }

  return result;
}

function buildIgnoreObject(rootDir: string, ignoreFilePath?: string): Ignore | undefined {
  if (!ignoreFilePath) {
    return undefined;
  }

  const pathWithRoot = path.join(rootDir, ignoreFilePath);
  if (!existsSync(pathWithRoot)) {
    return undefined;
  }

  const rules = readFileSync(pathWithRoot, "utf8");
  return ignore().add(rules);
}
