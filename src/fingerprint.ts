import { getGitIgnoredPaths } from "./git.js";
import { calculateContentHash } from "./inputs/content.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import type { Config, Fingerprint, FingerprintOptions } from "./types.js";
import { getInputFiles, getInputFilesSync, mergeHashes } from "./utils.js";

export async function calculateFingerprint(
  basePath: string,
  options?: FingerprintOptions,
): Promise<Fingerprint> {
  const { hashAlgorithm, files, contentInputs } = options ?? {};
  const config: Config = {
    basePath,
    hashAlgorithm,
  };

  const ignores = resolveIgnores(basePath, options);
  const inputFiles = await getInputFiles(basePath, { files, ignores });
  const fileHashes = await Promise.all(inputFiles.map((path) => calculateFileHash(path, config)));

  const contentHashes = contentInputs?.map((input) => calculateContentHash(input, config)) ?? [];
  return mergeHashes(fileHashes, contentHashes, config);
}

export function calculateFingerprintSync(
  basePath: string,
  options?: FingerprintOptions,
): Fingerprint {
  const { hashAlgorithm, files, contentInputs } = options ?? {};
  const config: Config = {
    basePath,
    hashAlgorithm,
  };

  const ignores = resolveIgnores(basePath, options);
  const inputFiles = getInputFilesSync(basePath, { files, ignores });
  const fileHashes = inputFiles.map((path) => calculateFileHashSync(path, config));

  const contentHashes = contentInputs?.map((input) => calculateContentHash(input, config)) ?? [];
  return mergeHashes(fileHashes, contentHashes, config);
}

function resolveIgnores(
  basePath: string,
  options?: FingerprintOptions,
): readonly string[] | undefined {
  if (!options?.gitIgnore) {
    return options?.ignores;
  }

  const hasOutsidePaths = options?.files?.some((pattern) => pattern.startsWith("..")) ?? false;
  let gitIgnores: string[] = [];
  try {
    gitIgnores = getGitIgnoredPaths(basePath, { entireRepo: hasOutsidePaths });
  } catch {
    console.warn("Failed to get git ignored files.");
    // Intentionally ignore git errors
  }
  return options?.ignores ? [...gitIgnores, ...options.ignores] : gitIgnores;
}
