import pLimit from "p-limit";

import { DEFAULT_CONCURRENCY } from "./constants.js";
import { calculateContentHash } from "./inputs/content.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import type {
  Config,
  ConfigWithBasePath,
  FileHash,
  Fingerprint,
  FingerprintOptions,
} from "./types.js";
import { getInputFiles, getInputFilesSync, mergeHashes } from "./utils.js";

export async function calculateFingerprint({
  basePath,
  hashAlgorithm,
  files,
  ignores,
  contentInputs,
  concurrency,
}: FingerprintOptions = {}): Promise<Fingerprint> {
  const config: Config = {
    basePath,
    hashAlgorithm,
  };

  let fileHashes: FileHash[] = [];
  if (basePath) {
    const inputFiles = await getInputFiles({
      basePath,
      files,
      ignores,
    });

    const limit = pLimit(concurrency ?? DEFAULT_CONCURRENCY);
    fileHashes = await Promise.all(
      inputFiles.map((path) => limit(() => calculateFileHash(path, config as ConfigWithBasePath))),
    );
  }

  const content = contentInputs?.map((input) => calculateContentHash(input, config)) ?? [];

  return mergeHashes(fileHashes, content, config);
}

export function calculateFingerprintSync({
  basePath,
  hashAlgorithm,
  files,
  ignores,
  contentInputs,
}: FingerprintOptions = {}): Fingerprint {
  const config: Config = {
    basePath,
    hashAlgorithm,
  };

  let fileHashes: FileHash[] = [];
  if (basePath) {
    const inputFiles = getInputFilesSync({
      basePath,
      files,
      ignores,
    });

    fileHashes = inputFiles.map((path) =>
      calculateFileHashSync(path, config as ConfigWithBasePath),
    );
  }

  const contentHashes = contentInputs?.map((input) => calculateContentHash(input, config)) ?? [];

  return mergeHashes(fileHashes, contentHashes, config);
}
