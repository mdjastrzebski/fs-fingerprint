export type HashAlgorithm = "sha1" | "sha256" | "sha512";

export type FingerprintArgs = {
  rootDir: string;
  include?: string[];
  exclude?: string[];
  extraSources?: FingerprintContentSource[];
  hashAlgorithm?: HashAlgorithm;
};

export type FingerprintConfig = {
  rootDir: string;
  exclude?: string[];
  hashAlgorithm?: HashAlgorithm;
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
  /** null when the file matches any of `exclude` */
  hash: string | null;
};

export type FingerprintDirectorySourceHash = {
  source: FingerprintDirectorySource;
  /** null when the directory matches any of `exclude` */
  hash: string | null;
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
