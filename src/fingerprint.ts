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
import { getInputFiles, getInputFilesSync, mergeHashes } from "./utils.js";

export async function calculateFingerprint(
  rootDir: string,
  options?: FingerprintOptions,
): Promise<FingerprintResult> {
  const inputFiles = await getInputFiles({
    rootDir,
    include: options?.include,
    exclude: options?.exclude,
  });

  const limit = pLimit(options?.concurrency ?? DEFAULT_CONCURRENCY);
  const config: FingerprintConfig = {
    rootDir,
    hashAlgorithm: options?.hashAlgorithm,
  };
  const inputHashes: FingerprintInputHash[] = await Promise.all(
    inputFiles.map((path) => limit(() => calculateFileHash(path, config))),
  );

  if (options?.extraInputs) {
    inputHashes.push(...calculateExtraInputHashes(options.extraInputs, config));
  }

  return mergeHashes(inputHashes, config) ?? { hash: EMPTY_HASH, inputs: [] };
}

export function calculateFingerprintSync(
  rootDir: string,
  options?: FingerprintOptions,
): FingerprintResult {
  const inputFiles = getInputFilesSync({
    rootDir,
    include: options?.include,
    exclude: options?.exclude,
  });

  const config: FingerprintConfig = {
    rootDir,
    hashAlgorithm: options?.hashAlgorithm,
  };
  const inputHashes: FingerprintInputHash[] = inputFiles.map((path) =>
    calculateFileHashSync(path, config),
  );

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
