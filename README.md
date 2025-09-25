# FS Fingerprint 🫆

Generate unique fingerprint hashes from filesystem state and other inputs (content, JSON, envs).

## What's This?

A fast Node.js library to generate unique fingerprints (hashes) based on the state of your filesystem: files paths and contents, and other inputs: text content, JSON, env variables.

Perfect for building intelligent caching solutions that automatically invalidate when your code or data changes. ⚡

## Features

- Fast change detection
- Hightly customizable (include/exclude patterns, extra inputs)
- Simple TypeScript API

## Quick Start

1. Install: `npm install fs-fingerprint` (or `yarn/pnpm/bun add fs-fingerprint`)
2. Code:

```ts
import { calculateFingerprint } from "fs-fingerprint";

const { hash } = await calculateFingerprint(rootPath, {
  include: ["ios/", "package.json"],
  exclude: ["build/"],
});
```

## API Reference

### `calculateFingerprint`

```ts
async function calculateFingerprint(
  rootDir: string, // Root directory path to scan
  options?: {
    include?: string[]; // Glob patterns to include files and directories (default: all)
    exclude?: string[]; // Glob patterns to exclude files and directories (default: none)
    extraInputs?: Input[]; // Additional inputs: content, JSON
    hashAlgorithm?: string; // Hash algorithm (default: sha1)
  },
): Promise<Fingerprint>;
```

Generates a fingerprint hash for filesystem state.

#### Return value

```typescript
interface Fingerprint {
  hash: string; // Hash value representing the overall fingerprint

  // Component hashes of the fingerprint:
  files: FileHash[]; // File hashes included in the fingerprint
  content: ContentHash[]; // Content hashes included in the fingerprint
}
```

### `calculateFingerprintSync`

```ts
function calculateFingerprintSync(
  rootDir: string, // Root directory path to scan
  options?: {
    include?: string[]; // Glob patterns to include files and directories (default: all)
    exclude?: string[]; // Glob patterns to exclude files and directories (default: none)
    extraInputs?: Input[]; // Additional inputs: content, JSON
    hashAlgorithm?: string; // Hash algorithm (default: sha1)
  },
): Fingerprint;
```

Sync version of `calculateFingerprint`:

- generates the same hash value without awaiting
- will be slower due to blocking filesystem reads

### `getGitIgnoredPaths`

```ts
function getGitIgnoredPaths(
  path: string,
  options: {
    entireRepo?: boolean;
  },
): string[];
```

Helper function to get list of paths ignored by Git from `.gitignore` and other Git settings. This function invokes `git ls-files` command, so it requires Git to be installed and available in PATH.

**Note**: this function might throw in case of errors (e.g. not a git repository). Use try/catch to handle errors.

#### Options

- `entireRepo` (boolean, default: `false`):
  - when false, returns ignored paths inside passed `path`
  - when true, searches for ignored paths in the whole git repository. Note: this option invokes the `git rev-parse --show-cdup` command to determine the git root directory, which may make the call slower.
  - In both cases, the returned paths are relative to the provided `path`.
  -

## Examples

**Basic usage:**

```typescript
const { hash } = await calculateFingerprint("./src");
console.log(hash); // "abc123..."
```

**Using include/exclude patterns:**

```typescript
const { hash } = await calculateFingerprint("./project", {
  include: ["src/", "package.json"],
  exclude: ["**/*.test.ts", "dist"],
});
```

**Using content inputs:**

```typescript
const { hash } = await calculateFingerprint("./src", {
  extraInputs: [
    { key: "some-config", content: "debug=true" }, // text input
    { key: "so-metadata", json: { version: "1.0", env: "prod" } }, // JSON data: objects, arrays, primitives
    { key: "much-envs", env: ["BUILD_ENVIROMENT", "FEATURE_FLAG"] }, // env variables
    { key: "api-key", env: ["API_KEY"], secret: true }, // secret env input, do not include value in fingerprint details
  ],
});
```

**Using `.gitignore` file:**

```typescript
// Get list of git-ignored paths
const gitIgnoredPaths = getGitIgnoredPaths("./src");

const { hash } = await calculateFingerprint("./src", {
  exclude: [...gitIgnoredPaths, "other/excludes/**"],
});
```

**Custom hash algorithm:**

```typescript
const { hash } = await calculateFingerprint("./src", {
  hashAlgorithm: "sha512",
});
```

**Synchronous call (slower):**

```typescript
const { hash } = calculateFingerprintSync("./src", { ...options });
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
