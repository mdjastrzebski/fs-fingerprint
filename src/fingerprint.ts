import * as fs from "node:fs";

import { getGitIgnoredPaths } from "./git.js";
import { calculateContentHash } from "./inputs/content.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import type { Config, Fingerprint, FingerprintOptions } from "./types.js";
import { getInputFiles, getInputFilesSync, mergeHashes } from "./utils.js";

/**
 * Calculates a deterministic fingerprint hash from filesystem state and content inputs.
 *
 * @param basePath - Root directory to resolve file paths against
 * @param options - Glob patterns, content inputs, and hashing options
 * @returns A fingerprint containing the combined hash and per-file/content details
 */
export async function calculateFingerprint(
  basePath: string,
  options?: FingerprintOptions,
): Promise<Fingerprint> {
  validateBasePath(basePath);
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

/**
 * Synchronous version of {@link calculateFingerprint}.
 *
 * @param basePath - Root directory to resolve file paths against
 * @param options - Glob patterns, content inputs, and hashing options
 * @returns A fingerprint containing the combined hash and per-file/content details
 */
export function calculateFingerprintSync(
  basePath: string,
  options?: FingerprintOptions,
): Fingerprint {
  validateBasePath(basePath);
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

function validateBasePath(basePath: string): void {
  if (!basePath) {
    throw new Error("basePath must be a non-empty string.");
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(basePath);
  } catch {
    throw new Error(`basePath does not exist: ${basePath}`);
  }

  if (!stat.isDirectory()) {
    throw new Error(`basePath is not a directory: ${basePath}`);
  }
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
    // Intentionally ignore git errors
  }

  return options?.ignores ? [...gitIgnores, ...options.ignores] : gitIgnores;
}
