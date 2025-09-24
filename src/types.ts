type StringWithAutoSuggest<T> = (string & {}) | T;

/**
 * Hashing algorithm to use
 * Common values: "sha1", "sha256", "sha512", etc.
 * TypeScript will auto-suggest these values, but other valid hash algorithms are allowed.
 */
export type HashAlgorithm = StringWithAutoSuggest<"sha1" | "sha256" | "sha512">;

export interface FingerprintOptions {
  /** File and directory paths to include (does NOT support globs) */
  include?: string[];

  /** Paths to exclude (support globs, "picomatch" syntax) */
  exclude?: string[];

  /** Extra inputs to include in the fingerprint: content, json, etc */
  extraInputs?: FingerprintInput[];

  /** Hashing algorithm to use */
  hashAlgorithm?: HashAlgorithm;

  /** Maximum number of concurrently opened files */
  concurrency?: number;
}

/**
 * Internal fingerprint config. Can change without semver.
 */
export interface FingerprintConfig {
  rootDir: string;
  hashAlgorithm?: HashAlgorithm;
}

export type FingerprintInput = FingerprintContentInput | FingerprintJsonInput;

export interface FingerprintContentInput {
  key: string;
  content: string;
}

export interface FingerprintJsonInput {
  key: string;
  json: unknown;
}

export interface Fingerprint {
  hash: string;
  files: FileHash[];
  data: DataHash[];
}

export interface FileHash {
  path: string;
  hash: string;
}

export interface DataHash {
  key: string;
  hash: string;
  data: unknown;
}
