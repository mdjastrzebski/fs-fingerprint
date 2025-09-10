# FS Fingerprint 🫆

Generate unique hashes for your project’s current state.

## What's This?

A fast Node.js library to generate unique fingerprints (hashes) based on the state of your filesystem : files, directories, and other content (string, JSON, etc).

Perfect for building intelligent caching solutions that automatically invalidate when your code or data changes. ⚡

## Features

- Fingerprint files, directories, strings, and JSON data
- Fast change detection (great for build systems)
- Simple TypeScript API

## Quick Start

1. Install: `npm install fs-fingerprint`
2. Code:

```ts
import { calculateFingerprint } from 'fs-fingerprint';

const { hash } = await calculateFingerprint(rootPath, {
  include: ['ios', 'package.json'],
  exclude: ['build'],
  ignoreFilePath: '.gitignore',
});
```

## API Reference

### `calculateFingerprint`

```ts
async function calculateFingerprint(
  rootDir: string, // Root directory path to scan
  options?: {
    include?: string[]; // Files and directories to include (default: all) - NOTE: this are NOT a glob patterns
    exclude?: string[]; // Glob patterns to exclude files and directories
    extraInputs?: FingerprintInput[]; // Additional inputs: content, JSON
    hashAlgorithm?: string; // Hash algorithm (default: sha1)
    ignoreFilePath?: string; // Path (relative to "rootDir") to ignore file, e.g. ".gitignore".
  }
): Promise<FingerprintResult<
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
    include?: string[]; // Files and directories to include (default: all) - NOTE: this are NOT a glob patterns
    exclude?: string[]; // Glob patterns to exclude files and directories
    extraInputs?: FingerprintInput[]; // Additional inputs: content, JSON
    hashAlgorithm?: string; // Hash algorithm (default: sha1)
    ignoreFilePath?: string; // Path (relative to "rootDir") to ignore file, e.g. ".gitignore".
  }
): FingerprintResult
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
    { key: "much-envs": json: [process.env.BUILD_ENVIROMENT, process.env.FEATURE_ENABLED]
  ],
});
```

**Using `.gitignore` file:**

```typescript
const { hash } = await calculateFingerprint("./src", {
  ignoreFilePath: ".gitignore",
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

## Contributing

PRs welcome! Keep it awesome.

## License

MIT 💝

---

Made with 💻 and ☕️ by [MDJ](https://x.com/mdj_dev/)
