# FS Fingerprint 🫆

Generate unique fingerprint hashes from filesystem (and other) state.

## What's This?

A fast Node.js library to generate unique fingerprints (hashes) based on the state of your filesystem: files, directories, and other content (string, JSON, etc).

Perfect for building intelligent caching solutions that automatically invalidate when your code or data changes. ⚡

## Features

- Fingerprint files, directories, strings, and JSON data
- Fast change detection (great for build systems)
- Simple TypeScript API

## Quick Start

1. Install: `npm install fs-fingerprint` (or `yarn/pnpm/bun add fs-fingerprint`)
2. Code:

```ts
import { calculateFingerprint } from "fs-fingerprint";

const { hash } = await calculateFingerprint(rootPath, {
  include: ["ios", "package.json"],
  exclude: ["build"],
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
    extraInputs?: FingerprintInput[]; // Additional inputs: content, JSON
    hashAlgorithm?: string; // Hash algorithm (default: sha1)
  },
): Promise<FingerprintResult>;
```

Generates a fingerprint hash for filesystem state.

#### Return value

```typescript
interface FingerprintResult {
  hash: string; // Generated fingerprint hash
  inputs: FingerprintInputHash[]; // Hashes for each provided input
}
```

### `calculateFingerprintSync`

```ts
function calculateFingerprintSync(
  rootDir: string, // Root directory path to scan
  options?: {
    include?: string[]; // Glob patterns to include files and directories (default: all)
    exclude?: string[]; // Glob patterns to exclude files and directories (default: none)
    extraInputs?: FingerprintInput[]; // Additional inputs: content, JSON
    hashAlgorithm?: string; // Hash algorithm (default: sha1)
  },
): FingerprintResult;
```

Sync version of `calculateFingerprint`:

- generates the same hash value without awaiting
- will be slower due to blocking filesystem reads

### Examples

**Basic usage:**

```typescript
const { hash } = await calculateFingerprint("./src");
console.log(hash); // "abc123..."
```

**Using include/exclude patterns:**

```typescript
const { hash } = await calculateFingerprint("./project", {
  include: ["src", "package.json"],
  exclude: ["**/*.test.ts", "dist"],
});
```

**Using extra inputs:**

```typescript
const { hash } = await calculateFingerprint("./src", {
  extraInputs: [
    { key: "some-config", content: "debug=true" },
    { key: "so-metadata", json: { version: "1.0", env: "prod" } },
    { key: "much-envs", json: [process.env.BUILD_ENVIROMENT, process.env.FEATURE_ENABLED] },
  ],
});
```

**Using `.gitignore` file:**

```typescript
// Will execute `git ls-files` to get ignored files
const gitIgnoredFiles = getGitIgnoredFiles("./src");

const { hash } = await calculateFingerprint("./src", {
  exclude: [...gitIgnoredFiles, "other/excludes/**"],
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
const { hash } = calculateFingerprintSync("./src", {
  hashAlgorithm: "sha512",
});
```

## Design Considerations

1. **File Hashing:**  
   A file’s hash is based only on its content, but not from the file’s own name or path.

2. **Flat manifest:**  
   Final hash is computed from list of all files and their hashes, sorted by their relative paths. This means that renaming or moving a file will change the final fingerprint, even if the file content remains unchanged.

## Contributing

PRs welcome! Keep it awesome.

## License

MIT 💝

---

Made with 💻 and ☕️ by [MDJ](https://x.com/mdj_dev/)
