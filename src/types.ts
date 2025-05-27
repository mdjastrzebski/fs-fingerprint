export type FingerprintArgs = {
  rootDir: string;
  sources: FingerprintSource[];
  ignorePaths: string[];
  hashAlgorithm?: "sha1" | "sha256" | "sha512";
};

export type FingerprintConfig = {
  rootDir: string;
  // TODO: to implement
  ignorePaths: string[];
  hashAlgorithm?: "sha1" | "sha256" | "sha512";
};

export type FingerprintSource =
  | FingerprintContentSource
  | FingerprintFileSource
  | FingerprintDirectorySource;

export type FingerprintContentSource = {
  type: "content";
  key: string;
  content: string;
};

export type FingerprintFileSource = {
  type: "file";
  key: string;
  path: string;
};

export type FingerprintDirectorySource = {
  type: "directory";
  key: string;
  path: string;
};

export type FingerprintContentSourceHash = {
  source: FingerprintContentSource;
  hash: string;
};

export type FingerprintFileSourceHash = {
  source: FingerprintFileSource;
  hash: string;
};

export type FingerprintDirectorySourceHash = {
  source: FingerprintDirectorySource;
  hash: string;
  children: FingerprintSourceHash[];
};

export type FingerprintSourceHash =
  | FingerprintContentSourceHash
  | FingerprintFileSourceHash
  | FingerprintDirectorySourceHash;

export type FingerprintHash = {
  hash: string;
  sources: FingerprintSourceHash[];
};
