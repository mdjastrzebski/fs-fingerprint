import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import ignore, { type Ignore } from "ignore";
import pLimit from "p-limit";

import { DEFAULT_CONCURRENCY, EMPTY_HASH } from "./constants.js";
import { calculateContentHash } from "./inputs/content.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import { calculateJsonHash } from "./inputs/json.js";
import type {
  FingerprintConfig,
  FingerprintInput,
  FingerprintInputHash,
  FingerprintOptions,
  FingerprintResult,
} from "./types.js";
import { generateFileList, generateFileListSync, mergeHashes } from "./utils.js";

export async function calculateFingerprint(
  rootDir: string,
  options?: FingerprintOptions,
): Promise<FingerprintResult> {
  const ignoreObject = buildIgnoreObject(rootDir, options?.ignoreFilePath);
  const inputFiles = await generateFileList({
    rootDir,
    include: options?.include,
    exclude: options?.exclude,
    excludeFn: ignoreObject ? (path) => ignoreObject.ignores(path) : undefined,
    concurrency: options?.concurrency ?? DEFAULT_CONCURRENCY,
  });

  const limit = pLimit(options?.concurrency ?? DEFAULT_CONCURRENCY);
  const config: FingerprintConfig = {
    rootDir,
    hashAlgorithm: options?.hashAlgorithm,
  };
  const inputHashes: FingerprintInputHash[] = (
    await Promise.all(inputFiles.map((path) => limit(() => calculateFileHash(path, config))))
  ).filter((hash) => hash != null);

  if (options?.extraInputs) {
    inputHashes.push(...calculateExtraInputHashes(options.extraInputs, config));
  }

  return mergeHashes(inputHashes, config) ?? { hash: EMPTY_HASH, inputs: [] };
}

export function calculateFingerprintSync(
  rootDir: string,
  options?: FingerprintOptions,
): FingerprintResult {
  const ignoreObject = buildIgnoreObject(rootDir, options?.ignoreFilePath);
  const inputFiles = generateFileListSync({
    rootDir,
    include: options?.include,
    exclude: options?.exclude,
    excludeFn: ignoreObject ? (path) => ignoreObject.ignores(path) : undefined,
  });

  const config: FingerprintConfig = {
    rootDir,
    hashAlgorithm: options?.hashAlgorithm,
  };
  const inputHashes: FingerprintInputHash[] = inputFiles
    .map((path) => calculateFileHashSync(path, config))
    .filter((hash) => hash != null);

  if (options?.extraInputs) {
    inputHashes.push(...calculateExtraInputHashes(options.extraInputs, config));
  }

  return mergeHashes(inputHashes, config) ?? { hash: EMPTY_HASH, inputs: [] };
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
