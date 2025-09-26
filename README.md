# FS Fingerprint 🫆

Generate unique fingerprint hashes from filesystem state and other inputs (text, JSON, envs).

## What's This?

A fast Node.js library to generate unique fingerprints based on:

- files & directories in your project
- other inputs: text content, JSON data, environment variables

Perfect for building intelligent caching solutions that automatically invalidate when your code or data changes. ⚡

## Features

- Fast change detection (we have benchmarks!)
- Highly customizable: include/exclude glob patterns, additional inputs, hashing algorithms
- Simple TypeScript API, both sync and async versions
- Supports `.gitignore` files

## Quick Start

1. Install: `npm install fs-fingerprint` (or `yarn/pnpm/bun add fs-fingerprint`)
2. Code:

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
  basePath: string; // Base path to relsolve "files" and "ignores" patterns against
  options?: {
    files?: string[]; // Glob patterns to include files and directories (default: include all)
    ignores?: string[]; // Glob patterns to exclude files and directories (default: ignore none)
    content?: Input[]; // Additional inputs: text, JSON, envs, etc.
    hashAlgorithm?: string; // Hash algorithm (default: "sha1")
    concurrency?: number; // Number of concurrent file reads (default: 16)
  }
): Promise<Fingerprint>;
```

Generates a fingerprint hash for filesystem state.

#### Return value

```typescript
interface Fingerprint {
  // Overall project fingerprint hash:
  hash: string;

  // Fingerprint manifest, what's included in the fingerprint:
  files: FileHash[]; // File hashes included in the fingerprint
  content: ContentHash[]; // Content hashes included in the fingerprint
}
```

### `calculateFingerprintSync`

```ts
function calculateFingerprintSync(
  basePath: string; // Base path to relsolve "files" and "ignores" patterns against
  options?: {
    files?: string[]; // Glob patterns to include files and directories (default: include all)
    ignores?: string[]; // Glob patterns to exclude files and directories (default: ignore none)
    content?: Input[]; // Additional inputs: text, JSON, envs, etc.
    hashAlgorithm?: string; // Hash algorithm (default: "sha1")
  }
): Fingerprint;
```

Sync version of `calculateFingerprint`:

- generates the same hash value without awaiting
- but will be slower due to blocking filesystem reads

### `getGitIgnoredPaths`

```ts
function getGitIgnoredPaths(
  basePath: string; // Base path to look for git ignored paths
  options: {
    entireRepo?: boolean; // If passed basePath is not the git root, search for ignored paths in the whole git repository (default: false)
  }
): string[];
```

Helper function to get list of paths ignored by Git from `.gitignore` and other Git settings. This function invokes `git ls-files` command, so it requires Git to be installed and available in PATH.

**Note**: this function might throw in case of errors (e.g. not a git repository). Use try/catch to handle errors.

#### Options

- `entireRepo`: If passed basePath is not the git root, use this option to search for ignored paths in the whole git repository (default: false). Always returns paths relative to the provided `basePath`.

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
  content: {
    "app-config": textContent("debug=true"), // text content
    "app-metadata": jsonContent({ version: "1.0", env: "prod" }), // JSON data: objects, arrays, primitives
    "app-envs": envContent(["BUILD_ENVIRONMENT", "FEATURE_FLAG"]), // env variables
    "signing-key": envContent(["API_KEY"], { secret: true }), // secret env input, do not include value in fingerprint details
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
   Final hash is computed from list of all files and their hashes, sorted by their relative paths. This means that renaming or moving a file will change the final fingerprint, even if the file content remains unchanged.

2. **File Hashing:**  
   Individual file’s hash is based only on its content, but not from the file’s own name or path. The final hash takes both file paths and their content hashes into account.

## Contributing

PRs welcome! Keep it awesome.

## License

MIT 💝

---

Made with 💻 and ☕️ by [MDJ](https://x.com/mdj_dev/)
