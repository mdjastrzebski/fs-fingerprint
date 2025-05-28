# FS Fingerprint 🫆

A universal filesystem-based fingerprinting library for intelligent caching and change detection.

## What's This?

A Node.js library that generates unique fingerprints based on your filesystem state - files, directories, and their contents.

Perfect for building intelligent caching solutions that automatically invalidate when your code or data changes. ⚡

## Features

- Generate fingerprints from files, directories, JSON data (coming soon), and file contents
- Fast change detection for build systems and caches
- Simple, intuitive TypeScript API

## Quick Start

1. Install: `npm install fs-fingerprint`
2. Start fingerprinting:

```
import { calculateFingerprint } from 'fs-fingerprint';

const { hash } = calculateFingerprint({
    sources: [
        directorySource('ios'),
        fileSource('package.json'),
    ],
    ignorePaths: [
        'node_modules'
    ]
});
```

## Contributing

PRs welcome! Keep it awesome.

## License

MIT 💝

---

Made with 💻 and ☕️ by [MDJ](https://x.com/mdj_dev/)

```

```
