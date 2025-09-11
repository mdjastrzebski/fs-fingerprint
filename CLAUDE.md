# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `pnpm build` - Compiles TypeScript using tsup, outputs both ESM and CJS formats
- **Type check**: `pnpm typecheck` - Runs TypeScript compiler without emitting files
- **Lint**: `pnpm lint` - Runs ESLint with the configured rules
- **Test**: `pnpm test` - Runs Vitest test suite
- **Test (single run)**: `pnpm test --no-watch` - Runs tests once without watch mode
- **Validation**: `pnpm validate` - Runs complete validation pipeline: typecheck, lint, test, and prettier check
- **Format check**: `pnpm prettier:check` - Checks code formatting
- **Format write**: `pnpm prettier:write` - Applies code formatting
- **Clean**: `pnpm clean` - Removes dist directory
- **Benchmark**: `pnpm bench` - Runs performance benchmarks

## Architecture

This is a filesystem fingerprinting library that generates unique hashes based on file/directory contents and metadata.

### Core Components

**Main API (`src/fingerprint.ts:22-54`)**:

- `calculateFingerprint()` - Main async function for generating fingerprints
- `calculateFingerprintSync()` - Synchronous version

**Input Types (`src/inputs/`)**:

- `file.ts` - Handles individual file hashing
- `directory.ts` - Handles directory tree hashing with recursive traversal
- `content.ts` - Handles raw content hashing
- `json.ts` - Handles JSON object hashing

**Key Features**:

- Supports include/exclude patterns using picomatch for glob matching
- Uses ignore library for .gitignore-style file filtering
- Configurable hash algorithms (sha1, sha256, sha512)
- Concurrent processing with p-limit for performance
- Both async and sync APIs

### Configuration

The library uses a `FingerprintConfig` object internally that combines:

- Root directory path
- Compiled exclude patterns (picomatch matchers)
- Hash algorithm selection
- Ignore file rules (from .gitignore-style files)
- Concurrency limiter for async operations

### Testing

Uses Vitest for testing with coverage reporting. Test files are located in `__tests__` directories alongside source files.
