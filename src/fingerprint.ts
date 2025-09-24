import pLimit from "p-limit";

import { DEFAULT_CONCURRENCY } from "./constants.js";
import { calculateContentHash } from "./inputs/content.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import { calculateJsonHash } from "./inputs/json.js";
import type {
  DataHash,
  FileHash,
  Fingerprint,
  FingerprintConfig,
  FingerprintInput,
  FingerprintOptions,
} from "./types.js";
import { getInputFiles, getInputFilesSync, mergeHashes } from "./utils.js";

export async function calculateFingerprint(
  rootDir: string,
  options?: FingerprintOptions,
): Promise<Fingerprint> {
  const inputFiles = await getInputFiles({
    rootDir,
    include: options?.include,
    exclude: options?.exclude,
  });

  const config: FingerprintConfig = {
    rootDir,
    hashAlgorithm: options?.hashAlgorithm,
  };

  const limit = pLimit(options?.concurrency ?? DEFAULT_CONCURRENCY);
  const fileHashes: FileHash[] = await Promise.all(
    inputFiles.map((path) => limit(() => calculateFileHash(path, config))),
  );

  const dataHashes: DataHash[] =
    options?.extraInputs?.map((input) => calculateDataHash(input, config)) ?? [];

  return mergeHashes(fileHashes, dataHashes, config);
}

export function calculateFingerprintSync(
  rootDir: string,
  options?: FingerprintOptions,
): Fingerprint {
  const inputFiles = getInputFilesSync({
    rootDir,
    include: options?.include,
    exclude: options?.exclude,
  });

  const config: FingerprintConfig = {
    rootDir,
    hashAlgorithm: options?.hashAlgorithm,
  };

  const fileHashes = inputFiles.map((path) => calculateFileHashSync(path, config));
  const dataHash = options?.extraInputs?.map((input) => calculateDataHash(input, config)) ?? [];

  return mergeHashes(fileHashes, dataHash, config);
}

function calculateDataHash(input: FingerprintInput, config: FingerprintConfig): DataHash {
  if ("content" in input) {
    return calculateContentHash(input, config);
  } else if ("json" in input) {
    return calculateJsonHash(input, config);
  } else {
    throw new Error(`Unsupported input type: ${JSON.stringify(input, null, 2)}`);
  }
}
