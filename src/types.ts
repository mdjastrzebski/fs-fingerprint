type StringWithAutoSuggest<T> = (string & {}) | T;

/**
 * Hashing algorithm to use
 * Common values: "sha1", "sha256", "sha512", etc.
 * TypeScript will auto-suggest these values, but other valid hash algorithms are allowed.
 */
export type HashAlgorithm = StringWithAutoSuggest<"sha1" | "sha256" | "sha512">;

export interface FingerprintOptions {
  /** Glob patterns indicating files (and directories) to include (default: '**' - all) */
  files?: readonly string[];

  /** Glob patterns indicating files (and directories) to ignore (default: none) */
  ignores?: readonly string[];

  /** Extra inputs to include in the fingerprint: text, json, etc (default: none) */
  contentInputs?: readonly ContentInput[];

  /** Hashing algorithm to use (default: "sha1") */
  hashAlgorithm?: HashAlgorithm;

  /** Whether to ignore files ignored by Git (default: false) */
  gitIgnore?: boolean;
}

/**
 * Internal fingerprint config. Can change without semver.
 */
export interface Config {
  basePath: string;
  hashAlgorithm?: HashAlgorithm;
}

export interface ContentInput {
  /** The key to identify the content */
  key: string;

  /** The content to hash */
  content: string;

  /**
   * Whether to omit the clear-text content from the fingerprint manifest.
   * It will still be included in the fingerprint hash.
   * (default: false)
   * */
  secret?: boolean;
}

/**
 * Unique fingerprint hash representing the matched files paths and content, as well as passed content inputs
 * */
export interface Fingerprint {
  /** The fingerprint hash */
  hash: string;

  /** Files included in the fingerprint hash */
  files: FileHash[];

  /** Content included in the fingerprint hash */
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
