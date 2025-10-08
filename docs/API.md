# API Reference

FS Fingerprint API consists of two levels: high-level and low-level APIs.

## High-level APIs

### `calculateFingerprint`

```ts
async function calculateFingerprint(
  basePath: string, // Base path to resolve "files" and "ignores" patterns
  options?: {
    files?: string[]; // Glob patterns to include (default: all)
    ignores?: string[]; // Glob patterns to exclude (default: none)
    contentInputs?: ContentInput[]; // Additional inputs: text, JSON, envs, etc.
    hashAlgorithm?: string; // Hash algorithm (default: "sha1")
  },
): Promise<Fingerprint>;
```

Generates a fingerprint hash for the filesystem state.

**Return Value**

```typescript
interface Fingerprint {
  hash: string; // Overall project fingerprint hash
  files: FileHash[]; // File hashes included in the fingerprint
  content: ContentHash[]; // Content hashes included in the fingerprint
}
```

### `calculateFingerprintSync`

```ts
function calculateFingerprintSync(
  basePath: string, // Base path to resolve "files" and "ignores" patterns
  options?: {
    files?: string[]; // Glob patterns to include (default: all)
    ignores?: string[]; // Glob patterns to exclude (default: none)
    contentInputs?: ContentInput[]; // Additional inputs: text, JSON, envs, etc.
    hashAlgorithm?: string; // Hash algorithm (default: "sha1")
  },
): Fingerprint;
```

**Return Value**

```typescript
interface Fingerprint {
  hash: string; // Overall project fingerprint hash
  files: FileHash[]; // File hashes included in the fingerprint
  content: ContentHash[]; // Content hashes included in the fingerprint
}
```

**Performance considerations**
In general async version should be faster due ability to read many files at the same time. However, in practices it has been observed as true on high-end machines, e.g. MacBook Pro.

On standard GitHub CI runner (`ubuntu-latest`) the sync version is 2x faster(!)

## Low-level APIs

### `getGitIgnoredPaths`

```ts
function getGitIgnoredPaths(
  basePath: string, // Base path to look for git ignored paths
  options?: {
    entireRepo?: boolean; // Search for ignored paths in the whole repo (default: false)
  },
): string[];
```

Helper to get paths ignored by Git from `.gitignore` and other Git settings.  
This function invokes `git ls-files`, so Git must be installed and available in PATH.

**Note:** This function may throw errors (e.g., not a git repository). Use `try/catch` to handle errors.

#### Options

- `entireRepo`: If `basePath` is not the git root, set this to search the entire repository. Always returns paths relative to `basePath`.
