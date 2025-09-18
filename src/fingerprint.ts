import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import ignore, { type Ignore } from "ignore";
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
  FingerprintResult,
} from "./types.js";
import { generateFileList, generateFileListSync, mergeHashes } from "./utils.js";

/**
 * Compute a fingerprint for a directory by hashing a generated list of input files and optional extra inputs.
 *
 * The function:
 * - Builds an ignore object from `options.ignoreFilePath` (if provided) and uses it when generating the file list.
 * - Generates the file list from `rootDir` using `options.include` / `options.exclude` and the ignore rules.
 * - Hashes files in parallel subject to `options.concurrency` and `options.hashAlgorithm`.
 * - Appends hashes for `options.extraInputs` (content or JSON inputs) if provided.
 * - Merges all input hashes into a single fingerprint; if merging yields no result, returns `{ hash: EMPTY_HASH, inputs: [] }`.
 *
 * @param rootDir - Root directory to scan for input files.
 * @param options - Optional behavior modifiers (include/exclude patterns, ignore file path, concurrency, hash algorithm, extra inputs).
 * @returns A Promise that resolves to the computed FingerprintResult (or a default empty fingerprint when no inputs produce a mergeable hash).
 */
export async function calculateFingerprint(
  rootDir: string,
  options?: FingerprintOptions,
): Promise<FingerprintResult> {
  const ignoreObject = buildIgnoreObject(rootDir, options?.ignoreFilePath);
  const inputFiles = await generateFileList({
    rootDir,
    include: options?.include,
    exclude: options?.exclude,
    excludeFn: ignoreObject ? (path) => ignoreObject.ignores(path) : undefined,
  });

  const limit = pLimit(options?.concurrency ?? DEFAULT_CONCURRENCY);
  const config: FingerprintConfig = {
    rootDir,
    hashAlgorithm: options?.hashAlgorithm,
  };
  const inputHashes: FingerprintInputHash[] = await Promise.all(
    inputFiles.map((path) => limit(() => calculateFileHash(path, config))),
  );

  if (options?.extraInputs) {
    inputHashes.push(...calculateExtraInputHashes(options.extraInputs, config));
  }

  return mergeHashes(inputHashes, config) ?? { hash: EMPTY_HASH, inputs: [] };
}

/**
 * Synchronously compute a fingerprint for a directory.
 *
 * Generates the list of files under `rootDir` (honoring `include`/`exclude` and an optional ignore file),
 * hashes each file using the configured algorithm, incorporates any `extraInputs`, and merges all input
 * hashes into a single FingerprintResult.
 *
 * If no inputs are present or merging yields no result, returns `{ hash: EMPTY_HASH, inputs: [] }`.
 *
 * @param rootDir - Root directory whose contents are fingerprinted.
 * @param options - Optional settings:
 *   - `include` / `exclude` — glob patterns to limit the files considered.
 *   - `ignoreFilePath` — path (relative to `rootDir`) to an ignore file whose rules are applied.
 *   - `extraInputs` — additional inlined inputs (content/json) to include in the fingerprint.
 *   - `hashAlgorithm` — optional hash algorithm to use for file hashing.
 *     (Note: concurrency is not used in the synchronous variant.)
 * @returns The computed FingerprintResult containing the final hash and the list of input hashes.
 */
export function calculateFingerprintSync(
  rootDir: string,
  options?: FingerprintOptions,
): FingerprintResult {
  const ignoreObject = buildIgnoreObject(rootDir, options?.ignoreFilePath);
  const inputFiles = generateFileListSync({
    rootDir,
    include: options?.include,
    exclude: options?.exclude,
    excludeFn: ignoreObject ? (path) => ignoreObject.ignores(path) : undefined,
  });

  const config: FingerprintConfig = {
    rootDir,
    hashAlgorithm: options?.hashAlgorithm,
  };
  const inputHashes: FingerprintInputHash[] = inputFiles.map((path) =>
    calculateFileHashSync(path, config),
  );

  if (options?.extraInputs) {
    inputHashes.push(...calculateExtraInputHashes(options.extraInputs, config));
  }

  return mergeHashes(inputHashes, config) ?? { hash: EMPTY_HASH, inputs: [] };
}

/**
 * Convert extra fingerprint inputs into their computed input hashes.
 *
 * Processes each entry in `inputs`: if the entry has a `content` field it is hashed as raw content;
 * if it has a `json` field it is hashed as JSON. Returns an array of corresponding FingerprintInputHash objects
 * in the same order as `inputs`.
 *
 * @param inputs - Extra inputs to include in the fingerprint; each item must have either `content` or `json`.
 * @param config - Fingerprint configuration (e.g., rootDir and hash algorithm) used when computing hashes.
 * @returns An array of computed FingerprintInputHash values for the provided inputs.
 * @throws Error If an input object does not contain a supported type (`content` or `json`).
 */
function calculateExtraInputHashes(
  inputs: FingerprintInput[],
  config: FingerprintConfig,
): FingerprintInputHash[] {
  const result: FingerprintInputHash[] = [];
  for (const input of inputs) {
    if ("content" in input) {
      result.push(calculateContentHash(input, config));
    } else if ("json" in input) {
      result.push(calculateJsonHash(input, config));
    } else {
      throw new Error(`Unsupported input type: ${JSON.stringify(input, null, 2)}`);
    }
  }

  return result;
}

function buildIgnoreObject(rootDir: string, ignoreFilePath?: string): Ignore | undefined {
  if (!ignoreFilePath) {
    return undefined;
  }

  const pathWithRoot = path.join(rootDir, ignoreFilePath);
  if (!existsSync(pathWithRoot)) {
    return undefined;
  }

  const rules = readFileSync(pathWithRoot, "utf8");
  return ignore().add(rules);
}
