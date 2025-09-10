import type { Ignore } from "ignore";
import type { Matcher } from "picomatch";

type StringWithAutoSuggest<T> = (string & {}) | T;

/** Hashing algorithm to use */
/**
 * Hashing algorithm to use.
 * Common values: "sha1", "sha256", "sha512", etc.
 * TypeScript will auto-suggest these values, but other valid hash algorithms are allowed.
 */
export type HashAlgorithm = StringWithAutoSuggest<"sha1" | "sha256" | "sha512">;

export type FingerprintOptions = {
  /** File and directory paths to include (does NOT support globs) */
  include?: readonly string[];

  /** Paths to exclude (support globs, "picomatch" syntax) */
  exclude?: readonly string[];

  /** Extra inputs to include in the fingerprint: content, json, etc */
  extraInputs?: FingerprintInput[];

  /** Hashing algorithm to use */
  hashAlgorithm?: HashAlgorithm;

  /**
   * Path (relative to rootDir) to ".gitignore"-like file.
   * Note: this supports .gitignore specs, by using "ignore" npm package.
   */
  ignoreFilePath?: string;

  /** Maximum number of concurrently opened files */
  maxConcurrent?: number;
};

export type AsyncWrapper = <T>(fn: () => PromiseLike<T> | T) => Promise<T>;

/**
 * Internal fingerprint config. Can change without semver.
 */
export type FingerprintConfig = {
  rootDir: string;
  exclude?: Matcher[];
  hashAlgorithm?: HashAlgorithm;
  ignoreObject?: Ignore;
  asyncWrapper?: AsyncWrapper;
};

export interface FingerprintContentInput {
  key: string;
  content: string;
}

export interface FingerprintJsonInput {
  key: string;
  json: unknown;
}

export interface FingerprintFileHash {
  type: "file";
  key: string;
  hash: string;
  path: string;
}

export interface FingerprintDirectoryHash {
  type: "directory";
  key: string;
  hash: string;
  path: string;
  children: FingerprintInputHash[];
}

export interface FingerprintContentHash {
  type: "content";
  key: string;
  hash: string;
  content: string;
}

export interface FingerprintJsonHash {
  type: "json";
  key: string;
  hash: string;
  json: unknown;
}

export type FingerprintInput = FingerprintContentInput | FingerprintJsonInput;

export type FingerprintInputHash =
  | FingerprintContentHash
  | FingerprintJsonHash
  | FingerprintFileHash
  | FingerprintDirectoryHash;

export type FingerprintResult = {
  hash: string;
  inputs: FingerprintInputHash[];
};
