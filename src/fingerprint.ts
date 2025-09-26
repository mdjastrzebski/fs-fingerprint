import pLimit from "p-limit";

import { DEFAULT_CONCURRENCY } from "./constants.js";
import { calculateContentHash } from "./inputs/content.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import type {
  Config,
  ContentInput,
  ContentValue,
  Fingerprint,
  FingerprintOptions,
} from "./types.js";
import { getInputFiles, getInputFilesSync, mergeHashes } from "./utils.js";

export async function calculateFingerprint(
  basePath: string,
  { hashAlgorithm, files, ignores, content, concurrency }: FingerprintOptions = {},
): Promise<Fingerprint> {
  const config: Config = {
    basePath,
    hashAlgorithm,
  };

  const inputFiles = await getInputFiles({
    basePath,
    files,
    ignores,
  });

  const limit = pLimit(concurrency ?? DEFAULT_CONCURRENCY);
  const fileHashes = await Promise.all(
    inputFiles.map((path) => limit(() => calculateFileHash(path, config))),
  );

  const contentHashes = content
    ? getContentInputs(content)?.map((input) => calculateContentHash(input, config))
    : [];

  return mergeHashes(fileHashes, contentHashes, config);
}

export function calculateFingerprintSync(
  basePath: string,
  { hashAlgorithm, files, ignores, content }: FingerprintOptions = {},
): Fingerprint {
  const config: Config = {
    basePath,
    hashAlgorithm,
  };

  const inputFiles = getInputFilesSync({
    basePath,
    files,
    ignores,
  });

  const fileHashes = inputFiles.map((path) => calculateFileHashSync(path, config));

  const contentHashes = content
    ? getContentInputs(content)?.map((input) => calculateContentHash(input, config))
    : [];

  return mergeHashes(fileHashes, contentHashes, config);
}

function getContentInputs(content: Record<string, ContentValue>): ContentInput[] {
  return Object.entries(content).map(([key, value]) => {
    return { key, ...value };
  });
}
