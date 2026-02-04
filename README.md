# FS Fingerprint 🫆

Generate deterministic fingerprint hashes from filesystem state and arbitrary content inputs.

## What is FS Fingerprint?

Given a directory, `fs-fingerprint` hashes the files inside it and produces a single fingerprint string. If any file changes, the fingerprint changes. You can also mix in text, JSON data, and environment variables as additional inputs.

This is useful for cache invalidation -- when you need to know whether source files (or configuration) have changed since the last build, deploy, or test run.

Speed matters because fingerprinting often runs on every build or CI job. The library is benchmarked on every change (`bun run bench`), has a single runtime dependency (`tinyglobby`), and weighs around 30 KB unpacked.

## Install

```sh
npm install fs-fingerprint
```

Also works with yarn, pnpm, and bun.

## Usage

```ts
import { calculateFingerprint } from "fs-fingerprint";

const { hash } = await calculateFingerprint("/project/path", {
  files: ["ios/", "package.json"],
  ignores: ["ios/build/"],
});
```

A synchronous version is also available:

```ts
import { calculateFingerprintSync } from "fs-fingerprint";

const { hash } = calculateFingerprintSync("/project/path", {
  files: ["src/"],
});
```

## API

### `calculateFingerprint` / `calculateFingerprintSync`

```ts
async function calculateFingerprint(
  basePath: string,
  options?: {
    files?: string[]; // Glob patterns to include (default: all files)
    ignores?: string[]; // Glob patterns to exclude
    contentInputs?: ContentInput[]; // Additional non-file inputs
    hashAlgorithm?: string; // "sha1" (default), "sha256", "sha512", etc.
    gitIgnore?: boolean; // Exclude git-ignored paths (default: false)
  },
): Promise<Fingerprint>;
```

Returns a `Fingerprint` object:

```ts
interface Fingerprint {
  hash: string; // Combined fingerprint hash
  files: FileHash[]; // Individual file hashes
  content: ContentHash[]; // Individual content input hashes
}
```

When `gitIgnore` is enabled, git errors are silently ignored (missing `git` binary, not a git repo, etc.).

See the [API reference](./docs/API.md) for the full API, including low-level helpers.

## Examples

### Include/exclude patterns

```ts
const { hash } = await calculateFingerprint("/project/path", {
  files: ["src/", "package.json"],
  ignores: ["**/*.test.ts", "dist"],
});
```

### Content inputs

Content inputs let you include non-file data in the fingerprint. Import the helpers alongside the main function:

```ts
import { calculateFingerprint, textContent, jsonContent, envContent } from "fs-fingerprint";

const { hash } = await calculateFingerprint("/project/path", {
  contentInputs: [
    textContent("app-config", "debug=true"),
    jsonContent("app-metadata", { version: "1.0", env: "prod" }),
    envContent("app-envs", ["BUILD_ENVIRONMENT", "FEATURE_FLAG"]),
    envContent("signing-key", ["API_KEY"], { secret: true }), // hashed but not included in output details
  ],
});
```

JSON inputs are key-sorted before hashing, so property order doesn't affect the fingerprint.

### `.gitignore` support

```ts
const { hash } = await calculateFingerprint("/project/path", {
  gitIgnore: true,
});
```

### Custom hash algorithm

```ts
const { hash } = await calculateFingerprint("/project/path", {
  hashAlgorithm: "sha512",
});
```

## Requirements

- Node.js >= 20
- ESM only (no CommonJS)

## How it works

1. Glob-match files under `basePath` using the `files` and `ignores` patterns
2. Hash each matched file by content
3. Hash any content inputs (text, JSON, env vars)
4. Sort everything by path/key and combine into a single fingerprint hash

File paths are part of the fingerprint, so renaming a file changes the hash even if the content is identical. File metadata (timestamps, permissions) is ignored -- only content matters.

## Contributing

PRs welcome! Keep it awesome.

## License

MIT 💝

---

Made with 💻 and ☕️ by [MDJ](https://x.com/mdj_dev/)
