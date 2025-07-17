# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands
- `pnpm build` - Build the library using tsup (generates ESM and CJS outputs)
- `pnpm typecheck` - Run TypeScript type checking without emitting files
- `pnpm lint` - Run ESLint for code quality checks
- `pnpm test` - Run tests using Vitest
- `pnpm validate` - Run all checks (typecheck, lint, test) in sequence

### Testing
- `pnpm test` - Run all tests with watch mode
- `pnpm test --no-watch` - Run tests once without watch mode

## Architecture

This is a TypeScript library that generates filesystem fingerprints for caching and change detection.

### Core Components

**Main Entry Point**: `src/fingerprint.ts`
- `calculateFingerprint()` - Primary function that takes glob patterns and returns a hash

**Type System**: `src/types.ts`
- `FingerprintArgs` - Configuration with includes/excludes patterns and extraSources
- `FingerprintSource` - Union type for content, file, and directory sources
- `FingerprintHash` - Final result with hash and source metadata

**Source Handlers**: `src/sources/`
- `content.ts` - Handles string content fingerprinting
- `file.ts` - Handles individual file fingerprinting
- `directory.ts` - Handles directory tree fingerprinting recursively
- `index.ts` - Dispatcher that routes to appropriate handler

**Utilities**: `src/utils.ts`
- `mergeSourceHashes()` - Combines multiple source hashes into final result

### Key Design Patterns

1. **Glob-based File Discovery**: Uses includes/excludes patterns to automatically discover files and directories
2. **Source Strategy Pattern**: Different source types (content, file, directory) are handled by dedicated modules
3. **Recursive Directory Processing**: Directory sources recursively process subdirectories and files
4. **Exclude Path Support**: Uses micromatch for glob-based path filtering
5. **Hash Algorithm Flexibility**: Supports sha1, sha256, sha512 algorithms

### Build System

- **tsup**: Builds both ESM and CJS outputs with TypeScript declarations
- **Vitest**: Test runner with TypeScript support
- **ESLint**: Code linting with TypeScript integration
- **pnpm**: Package manager (required - uses workspace features)

### Important Notes

- Uses ES modules (`"type": "module"`) with NodeNext module resolution
- Requires Node.js >= 20.0.0
- All paths are relative to `rootDir` configuration
- Includes/excludes patterns use glob syntax processed by micromatch
- Only top-level files and directories matching `includes` patterns are processed
- Files and directories matching `excludes` patterns are ignored recursively