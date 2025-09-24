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
  Fingerprint,
  FileHash,
} from "./types.js";
import { getInputFiles, getInputFilesSync, mergeHashes } from "./utils.js";
import { file } from "bun";

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

  let inputHashes: FingerprintInputHash[] =
    options?.extraInputs?.map((input) => calculateExtraInputHash(input, config)) ?? [];

  return mergeHashes(fileHashes, inputHashes, config);
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
  const inputHashes =
    options?.extraInputs?.map((input) => calculateExtraInputHash(input, config)) ?? [];

  return mergeHashes(fileHashes, inputHashes, config);
}

function calculateExtraInputHash(
  input: FingerprintInput,
  config: FingerprintConfig,
): FingerprintInputHash {
  if ("content" in input) {
    return calculateContentHash(input, config);
  } else if ("json" in input) {
    return calculateJsonHash(input, config);
  } else {
    throw new Error(`Unsupported input type: ${JSON.stringify(input, null, 2)}`);
  }
}
