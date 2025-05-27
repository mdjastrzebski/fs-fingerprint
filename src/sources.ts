import type {
  FingerprintContentSource,
  FingerprintDirectorySource,
  FingerprintFileSource,
} from "./types.js";

export function fileSource(path: string): FingerprintFileSource {
  return {
    type: "file",
    key: `file:${path}`,
    path,
  };
}

export function directorySource(path: string): FingerprintDirectorySource {
  return {
    type: "directory",
    key: `directory:${path}`,
    path,
  };
}

export function contentSource(key: string, content: string): FingerprintContentSource {
  return {
    type: "content",
    key: `content:${key}`,
    content,
  };
}
