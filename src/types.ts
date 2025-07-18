export type HashAlgorithm = "sha1" | "sha256" | "sha512";

export type FingerprintOptions = {
  include?: readonly string[];
  exclude?: readonly string[];
  extraInputs?: FingerprintContentInput[];
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

export type FingerprintInputHash =
  | FingerprintContentHash
  | FingerprintFileHash
  | FingerprintDirectoryHash;

export type FingerprintResult = {
  hash: string;
  inputs: FingerprintInputHash[];
};
