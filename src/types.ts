type StringWithAutoSuggest<T> = (string & {}) | T;

/**
 * Hashing algorithm to use
 * Common values: "sha1", "sha256", "sha512", etc.
 * TypeScript will auto-suggest these values, but other valid hash algorithms are allowed.
 */
export type HashAlgorithm = StringWithAutoSuggest<"sha1" | "sha256" | "sha512">;

export interface FingerprintOptions {
  /** File and directory paths to include (does NOT support globs) */
  include?: readonly string[];

  /** Paths to exclude (support globs, "picomatch" syntax) */
  exclude?: ReadonlyArray<string>;

  /** Extra inputs to include in the fingerprint: content, json, etc */
  extraInputs?: Input[];

  /** Hashing algorithm to use */
  hashAlgorithm?: HashAlgorithm;

  /** Maximum number of concurrently opened files */
  concurrency?: number;
}

/**
 * Internal fingerprint config. Can change without semver.
 */
export interface Config {
  rootDir: string;
  hashAlgorithm?: HashAlgorithm;
}

export type Input = ContentInput | JsonInput | EnvInput;

export interface ContentInput {
  key: string;
  content: string;
  secret?: boolean;
}

export interface JsonInput {
  key: string;
  json: unknown;
  secret?: boolean;
}

export interface EnvInput {
  key: string;
  envs: string[];
  secret?: boolean;
}

export interface Fingerprint {
  hash: string;
  files: FileHash[];
  content: ContentHash[];
}

export interface FileHash {
  path: string;
  hash: string;
}

export interface ContentHash {
  key: string;
  hash: string;
  content?: string;
}
