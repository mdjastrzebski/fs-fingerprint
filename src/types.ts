export type HashAlgorithm = "sha1" | "sha256" | "sha512" | "null";

export type FingerprintOptions = {
  include?: readonly string[];
  exclude?: readonly string[];
  extraInputs?: FingerprintInput[];
  hashAlgorithm?: HashAlgorithm;
  maxConcurrency?: number;
};

export type AsyncWrapper = <T>(fn: () => PromiseLike<T> | T) => Promise<T>;

export type FingerprintConfig = {
  rootDir: string;
  exclude?: readonly string[];
  hashAlgorithm?: HashAlgorithm;
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
