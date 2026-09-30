import { type Stats, statSync } from "node:fs";
import { stat } from "node:fs/promises";

import { getGitIgnoredPaths } from "./git.js";
import { calculateContentHash } from "./inputs/content.js";
import { calculateFileHash, calculateFileHashSync } from "./inputs/file.js";
import type { Config, Fingerprint, FingerprintOptions } from "./types.js";
import {
  getInputFiles,
  type GetInputFilesOptions,
  getInputFilesSync,
  mergeHashes,
  mergePaths,
  partitionGitIgnores,
} from "./utils.js";

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
  assertBasePathString(basePath);
  let stats: Stats;
  try {
    stats = await stat(basePath);
  } catch (error) {
    throw basePathStatError(basePath, error);
  }
  assertBasePathDirectory(basePath, stats);

  const { hashAlgorithm, contentInputs } = options ?? {};
  const config: Config = {
    basePath,
    hashAlgorithm,
  };

  const globs = resolveGlobs(basePath, options);
  const inputFiles = mergePaths(await Promise.all(globs.map((g) => getInputFiles(basePath, g))));
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
  assertBasePathString(basePath);
  let stats: Stats;
  try {
    stats = statSync(basePath);
  } catch (error) {
    throw basePathStatError(basePath, error);
  }
  assertBasePathDirectory(basePath, stats);

  const { hashAlgorithm, contentInputs } = options ?? {};
  const config: Config = {
    basePath,
    hashAlgorithm,
  };

  const globs = resolveGlobs(basePath, options);
  const inputFiles = mergePaths(globs.map((g) => getInputFilesSync(basePath, g)));
  const fileHashes = inputFiles.map((path) => calculateFileHashSync(path, config));

  const contentHashes = contentInputs?.map((input) => calculateContentHash(input, config)) ?? [];
  return mergeHashes(fileHashes, contentHashes, config);
}

function assertBasePathString(basePath: unknown): asserts basePath is string {
  if (typeof basePath !== "string" || basePath === "") {
    throw new TypeError("basePath must be a non-empty string");
  }
}

function basePathStatError(basePath: string, error: unknown): Error {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (code === "ENOENT" || code === "ENOTDIR") {
    return new Error(`basePath does not exist: ${basePath}`, { cause: error });
  }

  return new Error(`Failed to access basePath: ${basePath}`, { cause: error });
}

function assertBasePathDirectory(basePath: string, stats: Stats): void {
  if (!stats.isDirectory()) {
    throw new Error(`basePath is not a directory: ${basePath}`);
  }
}

/**
 * Returns the globs to run. Literal `files` entries that git ignores get a second glob,
 * so they are included without lifting the same git ignores for the other patterns.
 */
function resolveGlobs(basePath: string, options?: FingerprintOptions): GetInputFilesOptions[] {
  const { files, ignores = [] } = options ?? {};
  const gitIgnores = options?.gitIgnore === false ? [] : getGitIgnoresSafe(basePath, files);
  const mainGlob = { files, ignores: [...gitIgnores, ...ignores] };

  const { explicitFiles, remainingGitIgnores } = partitionGitIgnores(files, gitIgnores);
  if (explicitFiles.length === 0) {
    return [mainGlob];
  }

  return [mainGlob, { files: explicitFiles, ignores: [...remainingGitIgnores, ...ignores] }];
}

function getGitIgnoresSafe(basePath: string, files?: readonly string[]): string[] {
  const hasOutsidePaths = files?.some((pattern) => pattern.startsWith("..")) ?? false;
  try {
    return getGitIgnoredPaths(basePath, { entireRepo: hasOutsidePaths });
  } catch {
    // Silently fall back to no git ignores (e.g. not a git repo, git not installed)
    return [];
  }
}
