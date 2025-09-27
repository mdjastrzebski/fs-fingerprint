import { DEFAULT_CONCURRENCY } from "./constants.js";
import { calculateContentHash } from "./inputs/content.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import type { Config, FileHash, Fingerprint, FingerprintOptions } from "./types.js";
import { getInputFiles, getInputFilesSync, mergeHashes } from "./utils.js";

export async function calculateFingerprint(
  basePath: string,
  { hashAlgorithm, files, ignores, contentInputs, concurrency }: FingerprintOptions = {},
): Promise<Fingerprint> {
  const config: Config = {
    basePath,
    hashAlgorithm,
  };

  const inputFiles = await getInputFiles(basePath, { files, ignores });
  const fileHashes = await calculateFileHashesInBatches(inputFiles, config, concurrency);

  const contentHashes = contentInputs?.map((input) => calculateContentHash(input, config)) ?? [];
  return mergeHashes(fileHashes, contentHashes, config);
}

export function calculateFingerprintSync(
  basePath: string,
  { hashAlgorithm, files, ignores, contentInputs }: FingerprintOptions = {},
): Fingerprint {
  const config: Config = {
    basePath,
    hashAlgorithm,
  };

  const inputFiles = getInputFilesSync(basePath, { files, ignores });
  const fileHashes = inputFiles.map((path) => calculateFileHashSync(path, config));
  const contentHashes = contentInputs?.map((input) => calculateContentHash(input, config)) ?? [];
  return mergeHashes(fileHashes, contentHashes, config);
}

async function calculateFileHashesInBatches(
  inputFiles: string[],
  config: Config,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<FileHash[]> {
  const result: FileHash[] = [];
  for (let i = 0; i < inputFiles.length; i += concurrency) {
    const batchPaths = inputFiles.slice(i, i + concurrency);
    const batchHashes = await Promise.all(
      batchPaths.map((path) => calculateFileHash(path, config)),
    );
    result.push(...batchHashes);
  }

  return result;
}
