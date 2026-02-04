# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Commands

```bash
bun test                    # Run tests (watch mode)
bun test --no-watch         # Run tests once
bun test --coverage         # Run tests with coverage
bun test src/__tests__/fingerprint.test.ts  # Run a single test file
bun run build               # Build (clean + tsup)
bun run typecheck            # TypeScript type checking
bun run lint                 # ESLint
bun run prettier:check       # Check formatting
bun run prettier:write       # Auto-format
bun run validate             # Full validation (typecheck + lint + test + prettier)
bun run bench                # Run benchmarks
```

## Architecture

**fs-fingerprint** is an ESM-only TypeScript library that generates deterministic fingerprint hashes from filesystem state and arbitrary content inputs. It uses Bun as its runtime/test runner and tsup for bundling.

### Core Flow

`calculateFingerprint(basePath, options)` (async) and `calculateFingerprintSync` (sync) are the main entry points. The pipeline is:

1. **Resolve ignores** — merge user-provided `ignores` patterns with `.gitignore` paths (if `gitIgnore: true`), using `git ls-files` to discover ignored files
2. **Discover files** — glob matching via `tinyglobby` (the only runtime dependency)
3. **Hash files** — content-based hashing of each matched file (async variant uses `Promise.all`)
4. **Hash content inputs** — process `textContent`, `jsonContent`, `envContent` entries (JSON inputs get key-sorted for determinism)
5. **Merge** — combine sorted file and content hashes into a single fingerprint hash

### Module Layout

- `src/fingerprint.ts` — orchestrates the fingerprint pipeline (async + sync)
- `src/inputs/file.ts` — reads and hashes individual files
- `src/inputs/content.ts` — hashes non-file inputs (text, JSON, env vars); `secret` flag omits cleartext from output while still hashing
- `src/utils.ts` — `hashData`, `mergeHashes`, glob helpers, sorting
- `src/git.ts` — `getGitIgnoredPaths` via `git ls-files`, git root detection
- `src/types.ts` — all public types (`FingerprintOptions`, `Fingerprint`, `FileHash`, `ContentHash`, etc.)
- `src/constants.ts` — `EMPTY_HASH = "(null)"`, `DEFAULT_HASH_ALGORITHM = "sha1"`
- `test-utils/` — shared test helpers for assertions, formatting, and temp filesystem setup

### Key Design Decisions

- **Flat manifest**: file paths are part of the fingerprint, so renames change the hash even if content is unchanged
- **Content-only file hashing**: file hashes are based solely on content, not metadata
- **Both async and sync APIs** with identical interfaces and results
- **ESM-only** (no CommonJS output)
- **Node.js >= 20** required

## Testing

Tests use Bun's built-in test runner. Test files live in `__tests__/` directories colocated with source. The test root is `src/` (configured in `bunfig.toml`). Tests create temporary directories for filesystem assertions — see `test-utils/fs.ts` for helpers.

## Linting

ESLint uses flat config format. Notable rules:

- `simple-import-sort` for import ordering
- TypeScript inline type imports enforced
- `.only` and `.skip` are forbidden in test files
