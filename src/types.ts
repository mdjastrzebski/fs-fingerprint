export type HashAlgorithm = "sha1" | "sha256" | "sha512";

export type FingerprintOptions = {
  include?: readonly string[];
  exclude?: readonly string[];
  extraInputs?: FingerprintInput[];
  hashAlgorithm?: HashAlgorithm;
};

export type FingerprintConfig = {
  rootDir: string;
  exclude?: readonly string[];
  hashAlgorithm?: HashAlgorithm;
};

export type FingerprintFileInput = {
  type: "file";
  key: string;
  path: string;
};

export type FingerprintDirectoryInput = {
  type: "directory";
  key: string;
  path: string;
};

export interface FingerprintContentInput {
  type: "content";
  key: string;
  content: string;
}

export interface FingerprintJsonInput {
  type: "json";
  key: string;
  data: unknown;
}

export interface FingerprintFileHash extends FingerprintFileInput {
  hash: string;
}

export interface FingerprintDirectoryHash extends FingerprintDirectoryInput {
  hash: string;
  children: FingerprintInputHash[];
}

export interface FingerprintContentHash extends FingerprintContentInput {
  hash: string;
}

export interface FingerprintJsonHash extends FingerprintJsonInput {
  hash: string;
}

export type FingerprintInput =
  | FingerprintContentInput
  | FingerprintJsonInput
  | FingerprintFileInput
  | FingerprintDirectoryInput;

export type FingerprintInputHash =
  | FingerprintContentHash
  | FingerprintJsonHash
  | FingerprintFileHash
  | FingerprintDirectoryHash;

export type FingerprintResult = {
  hash: string;
  inputs: FingerprintInputHash[];
};
