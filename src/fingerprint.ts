import pLimit from "p-limit";

import { DEFAULT_CONCURRENCY } from "./constants.js";
import { calculateContentHash } from "./inputs/content.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import type { Config, ContentHash, FileHash, Fingerprint, FingerprintOptions } from "./types.js";
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

  const config: Config = {
    rootDir,
    hashAlgorithm: options?.hashAlgorithm,
  };

  const limit = pLimit(options?.concurrency ?? DEFAULT_CONCURRENCY);
  const fileHashes: FileHash[] = await Promise.all(
    inputFiles.map((path) => limit(() => calculateFileHash(path, config))),
  );

  const contentHashes: ContentHash[] =
    options?.extraInputs?.map((input) => calculateContentHash(input, config)) ?? [];

  return mergeHashes(fileHashes, contentHashes, config);
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

  const config: Config = {
    rootDir,
    hashAlgorithm: options?.hashAlgorithm,
  };

  const fileHashes = inputFiles.map((path) => calculateFileHashSync(path, config));
  const contentHashes =
    options?.extraInputs?.map((input) => calculateContentHash(input, config)) ?? [];

  return mergeHashes(fileHashes, contentHashes, config);
}
