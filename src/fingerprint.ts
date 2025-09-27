import pLimit from "p-limit";

import { DEFAULT_CONCURRENCY } from "./constants.js";
import { calculateContentHash } from "./inputs/content.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import type { Config, ContentHash, Fingerprint, FingerprintOptions, InputRecord } from "./types.js";
import { getInputFiles, getInputFilesSync, mergeHashes } from "./utils.js";

export async function calculateFingerprint(
  basePath: string,
  { hashAlgorithm, files, ignores, extraInputs: content, concurrency }: FingerprintOptions = {},
): Promise<Fingerprint> {
  const config: Config = {
    basePath,
    hashAlgorithm,
  };

  const limit = pLimit(concurrency ?? DEFAULT_CONCURRENCY);
  const inputFiles = await getInputFiles(basePath, { files, ignores });
  const fileHashes = await Promise.all(
    inputFiles.map((path) => limit(() => calculateFileHash(path, config))),
  );

  const contentHashes = calculateContentHashes(content, config);
  return mergeHashes(fileHashes, contentHashes, config);
}

export function calculateFingerprintSync(
  basePath: string,
  { hashAlgorithm, files, ignores, extraInputs: content }: FingerprintOptions = {},
): Fingerprint {
  const config: Config = {
    basePath,
    hashAlgorithm,
  };

  const inputFiles = getInputFilesSync(basePath, { files, ignores });
  const fileHashes = inputFiles.map((path) => calculateFileHashSync(path, config));

  const contentHashes = calculateContentHashes(content, config);
  return mergeHashes(fileHashes, contentHashes, config);
}

function calculateContentHashes(inputs: InputRecord | undefined, config: Config): ContentHash[] {
  if (!inputs) return [];

  return Object.entries(inputs).map(([key, value]) =>
    calculateContentHash({ key, ...value }, config),
  );
}
