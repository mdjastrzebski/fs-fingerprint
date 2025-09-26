type StringWithAutoSuggest<T> = (string & {}) | T;

/**
 * Hashing algorithm to use
 * Common values: "sha1", "sha256", "sha512", etc.
 * TypeScript will auto-suggest these values, but other valid hash algorithms are allowed.
 */
export type HashAlgorithm = StringWithAutoSuggest<"sha1" | "sha256" | "sha512">;

export interface FingerprintOptions {
  /** Glob patterns indicating files (and directories) to include */
  files?: readonly string[];

  /** Glob patterns indicating files (and directories) to ignore */
  ignores?: readonly string[];

  /** Extra inputs to include in the fingerprint: content, json, etc */
  contentInputs?: Record<string, ContentValue>;

  /** Hashing algorithm to use */
  hashAlgorithm?: HashAlgorithm;

  /** Maximum number of concurrently opened files */
  concurrency?: number;
}

/**
 * Internal fingerprint config. Can change without semver.
 */
export interface Config {
  basePath: string;
  hashAlgorithm?: HashAlgorithm;
}

export interface ContentInput {
  key: string;
  content: string;
  secret?: boolean;
}

export interface ContentValue {
  content: string;
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
