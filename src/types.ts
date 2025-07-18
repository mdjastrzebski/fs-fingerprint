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

export type FingerprintInput =
  | FingerprintContentInput
  | FingerprintFileInput
  | FingerprintDirectoryInput;

export type FingerprintContentInput = {
  type: "content";
  key: string;
  content: string;
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

export type FingerprintContentInputHash = {
  input: FingerprintContentInput;
  hash: string;
};

export type FingerprintFileInputHash = {
  input: FingerprintFileInput;
  /** null when the file matches any of `exclude` */
  hash: string | null;
};

export type FingerprintDirectoryInputHash = {
  input: FingerprintDirectoryInput;
  /** null when the directory matches any of `exclude` */
  hash: string | null;
  children: FingerprintInputHash[];
};

export type FingerprintInputHash =
  | FingerprintContentInputHash
  | FingerprintFileInputHash
  | FingerprintDirectoryInputHash;

export type FingerprintHash = {
  hash: string;
  inputs: FingerprintInputHash[];
};
