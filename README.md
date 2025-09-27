# FS Fingerprint 🫆

Generate unique fingerprint hashes from filesystem state and other inputs (text, JSON, envs).

## What is FS Fingerprint?

A fast Node.js library to generate unique fingerprints based on:

- Files & directories in your project
- Other inputs: text content, JSON data, environment variables

Perfect for building intelligent caching solutions that automatically invalidate when your code or data changes. ⚡

## Features

- Fast change detection (with benchmarks)
- Highly customizable: include/exclude glob patterns, additional inputs, hashing algorithms
- Simple TypeScript API, both sync and async
- Supports `.gitignore` files

## Quick Start

1. **Install:**  
   `npm install fs-fingerprint`  
   (or `yarn/pnpm/bun add fs-fingerprint`)
2. **Usage:**

```ts
import { calculateFingerprint } from "fs-fingerprint";

const { hash } = await calculateFingerprint("/project/path", {
  files: ["ios/", "package.json"],
  ignores: ["ios/build/"],
});
```

## API Reference

### `calculateFingerprint`

```ts
async function calculateFingerprint(
  basePath: string, // Base path to resolve "files" and "ignores" patterns
  options?: {
    files?: string[]; // Glob patterns to include (default: all)
    ignores?: string[]; // Glob patterns to exclude (default: none)
    extraInputs?: InputRecord; // Additional inputs: text, JSON, envs, etc.
    hashAlgorithm?: string; // Hash algorithm (default: "sha1")
    concurrency?: number; // Concurrent file reads (default: 16)
  },
): Promise<Fingerprint>;
```

Generates a fingerprint hash for the filesystem state.

#### Return Value

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
    extraInputs?: InputRecord; // Additional inputs: text, JSON, envs, etc.
    hashAlgorithm?: string; // Hash algorithm (default: "sha1")
  },
): Fingerprint;
```

Sync version of `calculateFingerprint`:

- Generates the same hash value without `await`
- May be slower due to blocking filesystem reads

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

## Examples

**Basic usage:**

```typescript
const { hash } = await calculateFingerprint("/project/path");
console.log(hash); // "abc123..."
```

**Using include/exclude patterns:**

```typescript
const { hash } = await calculateFingerprint("/project/path", {
  files: ["src/", "package.json"],
  ignores: ["**/*.test.ts", "dist"],
});
```

**Using content inputs:**

```typescript
const { hash } = await calculateFingerprint("/project/path", {
  // ...
  content: {
    "app-config": textContent("debug=true"), // Text content
    "app-metadata": jsonContent({ version: "1.0", env: "prod" }), // JSON data
    "app-envs": envContent(["BUILD_ENVIRONMENT", "FEATURE_FLAG"]), // Env variables
    "signing-key": envContent(["API_KEY"], { secret: true }), // Secret env input (value not included in details)
  },
});
```

**Using `.gitignore` file:**

```typescript
// Get list of git-ignored paths
const gitIgnoredPaths = getGitIgnoredPaths("/project/path");

const { hash } = await calculateFingerprint("/project/path", {
  ignores: [...gitIgnoredPaths, "other/ignores/**"],
});
```

**Custom hash algorithm:**

```typescript
const { hash } = await calculateFingerprint("/project/path", {
  hashAlgorithm: "sha512",
});
```

**Synchronous call (slower):**

```typescript
const { hash } = calculateFingerprintSync("/project/path", { ...options });
```

## Design Considerations

1. **Flat manifest:**  
   The final hash is computed from a list of all files and their hashes, sorted by relative path. Renaming or moving a file changes the fingerprint, even if content is unchanged.

2. **File Hashing:**  
   Each file’s hash is based only on its content (not name or path). The final hash includes both file paths and their content hashes.

## Contributing

PRs welcome! Keep it awesome.

## License

MIT 💝

---

Made with 💻 and ☕️ by [MDJ](https://x.com/mdj_dev/)
