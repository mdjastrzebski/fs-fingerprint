# API reference

## `calculateFingerprint`

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

Generates a fingerprint hash from the filesystem state under `basePath`.

```ts
const fp = await calculateFingerprint("./my-project", {
  files: ["src/**/*.ts"],
  ignores: ["**/*.test.ts"],
  hashAlgorithm: "sha256",
});

console.log(fp.hash); // "a1b2c3..."
```

## `calculateFingerprintSync`

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

Synchronous version of `calculateFingerprint`. Same parameters, same return type.

The async version is generally faster because it reads files in parallel. In practice, this difference shows mainly on higher-end machines. On standard GitHub CI runners (`ubuntu-latest`), the sync version is about 2x faster.

## Content input helpers

These functions create `ContentInput` objects for use with the `contentInputs` option. They let you include non-file data in the fingerprint.

### `textContent`

```ts
function textContent(key: string, text: string, options?: { secret?: boolean }): ContentInput;
```

Creates an input from a plain text string.

```ts
const fp = await calculateFingerprint("./my-project", {
  contentInputs: [textContent("version", "1.0.0")],
});
```

### `jsonContent`

```ts
function jsonContent(key: string, json: unknown, options?: { secret?: boolean }): ContentInput;
```

Creates an input from a JSON-serializable value. Object keys are sorted before hashing, so property order doesn't affect the fingerprint.

```ts
const fp = await calculateFingerprint("./my-project", {
  contentInputs: [jsonContent("deps", { react: "^19.0.0", typescript: "~5.7.0" })],
});
```

### `envContent`

```ts
function envContent(key: string, envs: string[], options?: { secret?: boolean }): ContentInput;
```

Creates an input from environment variable values. Pass an array of variable names.

```ts
const fp = await calculateFingerprint("./my-project", {
  contentInputs: [envContent("build-env", ["NODE_ENV", "CI"], { secret: true })],
});
```

The `secret` option (available on all three helpers) omits the clear-text content from the fingerprint output while still including it in the hash.

## `getGitIgnoredPaths`

```ts
function getGitIgnoredPaths(basePath: string, options?: { entireRepo?: boolean }): string[];
```

Returns paths ignored by Git (from `.gitignore` and other Git ignore rules) by running `git ls-files`. Git must be installed and available in PATH.

This function throws if the directory is not inside a git repository.

**Options**

- `entireRepo` -- set to `true` when `basePath` is not the git root to search the entire repository for ignored paths. Returned paths are always relative to `basePath`.

## Types

### `FingerprintOptions`

```ts
interface FingerprintOptions {
  files?: readonly string[]; // Glob patterns to include (default: "**")
  ignores?: readonly string[]; // Glob patterns to exclude (default: none)
  contentInputs?: readonly ContentInput[];
  hashAlgorithm?: HashAlgorithm; // Default: "sha1"
  gitIgnore?: boolean; // Exclude git-ignored files (default: false)
}
```

### `Fingerprint`

```ts
interface Fingerprint {
  hash: string; // Combined fingerprint hash
  files: FileHash[]; // Individual file hashes
  content: ContentHash[]; // Individual content input hashes
}
```

### `FileHash`

```ts
interface FileHash {
  path: string;
  hash: string;
}
```

### `ContentHash`

```ts
interface ContentHash {
  key: string;
  hash: string;
  content?: string; // Omitted when secret is true
}
```

### `ContentInput`

```ts
interface ContentInput {
  key: string;
  content: string;
  secret?: boolean;
}
```

### `HashAlgorithm`

```ts
type HashAlgorithm = "sha1" | "sha256" | "sha512" | (string & {});
```

Any algorithm supported by Node.js `crypto.createHash` works. TypeScript will auto-suggest the three common ones.
