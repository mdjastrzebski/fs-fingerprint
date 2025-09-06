import type { Ignore } from "ignore";

type StringWithAutoSuggest<T> = (string & {}) | T;

/** Hashing algorithm to use */
/**
 * Hashing algorithm to use.
 * Common values: "sha1", "sha256", "sha512", "null", etc.
 * TypeScript will auto-suggest these values, but any string is allowed.
 */
export type HashAlgorithm = StringWithAutoSuggest<"sha1" | "sha256" | "sha512" | "null">;

export type FingerprintOptions = {
  /** Paths to include (does not support globs) */
  include?: readonly string[];

  /** Paths to exclude (support globs, minimatch syntax) */
  exclude?: readonly string[];

  /** Extra inputs to include in the fingerprint */
  extraInputs?: FingerprintInput[];
  
  /** Hashing algorithm to use */
  hashAlgorithm?: HashAlgorithm;

  /** 
   * Path (relative to rootDir) to ".gitignore"-like file.
   * Defaults to ".gitignore". Set to `null` to disable.
   */
  gitIgnorePath?: string | null;

  /** Maximum number of concurrently opened files */ 
  maxConcurrent?: number;
};

export type AsyncWrapper = <T>(fn: () => PromiseLike<T> | T) => Promise<T>;

export type FingerprintConfig = {
  rootDir: string;
  exclude?: readonly string[];
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
