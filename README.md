# FS Fingerprint 🫆

A universal filesystem-based fingerprinting library for intelligent caching and change detection.

## What's This?

A Node.js library that generates unique fingerprints based on your filesystem state - files, directories, and their contents.

Perfect for building intelligent caching solutions that automatically invalidate when your code or data changes. ⚡

## Features

- Generate fingerprints from files, directories, JSON data, and any other content.
- Fast change detection for build systems and caches
- Simple, intuitive TypeScript API

## Quick Start

1. Install: `npm install fs-fingerprint`
2. Start fingerprinting:

```
import { calculateFingerprint } from 'fs-fingerprint';

const { hash } = calculateFingerprint(rootPath, {
    include: ['ios', 'package.json'],
    exclude: ['build']
});
```

## API Reference

### `calculateFingerprint(rootDir, options?)`

Main function that generates a fingerprint for filesystem entries.

**Parameters:**
- `rootDir` (string) - Root directory path to scan
- `options` (object, optional) - Configuration options

**Returns:** `FingerprintResult`
- `hash` (string) - Generated fingerprint hash
- `inputs` (array) - Array of processed input hashes

#### Options

```typescript
interface FingerprintOptions {
  include?: string[];      // Glob patterns to include (default: all)
  exclude?: string[];      // Glob patterns to exclude
  extraInputs?: FingerprintInput[];  // Additional content/JSON inputs
  hashAlgorithm?: 'sha1' | 'sha256' | 'sha512';  // Hash algorithm (default: sha256)
}
```

### Return value

```typescript
interface FingerprintResult {
  hash: string;
  inputs: FingerprintInputHash[];
}
```

### Examples

**Basic usage:**
```typescript
const result = calculateFingerprint('./src');
console.log(result.hash); // "abc123..."
```

**With include/exclude patterns:**
```typescript
const result = calculateFingerprint('./project', {
  include: ['src/**', 'package.json'],
  exclude: ['**/*.test.ts', 'dist']
});
```

**With extra inputs:**
```typescript
const result = calculateFingerprint('./src', {
  extraInputs: [
    { key: 'config', content: 'debug=true' },
    { key: 'metadata', json: { version: '1.0', env: 'prod' } }
  ]
});
```

**Custom hash algorithm:**
```typescript
const result = calculateFingerprint('./src', {
  hashAlgorithm: 'sha512'
});
```

## Contributing

PRs welcome! Keep it awesome.

## License

MIT 💝

---

Made with 💻 and ☕️ by [MDJ](https://x.com/mdj_dev/)
