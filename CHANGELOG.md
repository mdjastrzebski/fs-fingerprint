# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.14.0...HEAD)

### ⚠ BREAKING CHANGES

- `calculateFingerprint` and `calculateFingerprintSync` now throw when `basePath` is empty, doesn't exist, isn't a directory, or can't be accessed. Previously these cases silently returned an empty fingerprint (or, for `""`, fingerprinted the current directory), which could hide a mistyped path. If you fingerprint a directory that may not exist yet, check for it before calling. ([#41](https://github.com/mdjastrzebski/fs-fingerprint/issues/41))

- Public types are now exported by name. The internal `Config` type is no longer exported. ([#41](https://github.com/mdjastrzebski/fs-fingerprint/issues/41))

### ✨ Features

- export `GetGitIgnoredPathsOptions` type for use with `getGitIgnoredPaths` ([#41](https://github.com/mdjastrzebski/fs-fingerprint/issues/41))
- JSDoc for the public API ([#41](https://github.com/mdjastrzebski/fs-fingerprint/issues/41))

### 📚 Documentation

- improve docs ([#40](https://github.com/mdjastrzebski/fs-fingerprint/issues/40)) ([b3ab0eb](https://github.com/mdjastrzebski/fs-fingerprint/commit/b3ab0eb12e2c80f3caa1b8099da79cfc24da32e8))
- document `gitIgnore` option and `basePath` errors in the API reference ([#41](https://github.com/mdjastrzebski/fs-fingerprint/issues/41))
- clarify that `envContent` treats unset variables the same as empty strings ([#41](https://github.com/mdjastrzebski/fs-fingerprint/issues/41))

## [0.14.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.13.0...v0.14.0) (2025-10-08)

### ✨ Features

- `gitIgnore` option ([#37](https://github.com/mdjastrzebski/fs-fingerprint/issues/37)) ([4ca17dd](https://github.com/mdjastrzebski/fs-fingerprint/commit/4ca17ddec5c80e06d93b61733145a7695872487a))

### 🛠️ Chores

- ESM-only package ([#38](https://github.com/mdjastrzebski/fs-fingerprint/issues/38)) ([af22bcd](https://github.com/mdjastrzebski/fs-fingerprint/commit/af22bcd)) _(not listed in the original GitHub release notes)_

### 📚 Documentation

- api docs ([#39](https://github.com/mdjastrzebski/fs-fingerprint/issues/39)) ([51b54d4](https://github.com/mdjastrzebski/fs-fingerprint/commit/51b54d4ef96244310e922f81ac85296d79041c50))

## [0.13.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.12.0...v0.13.0) (2025-09-28)

### ✨ Features

- switch to binary encoding ([#36](https://github.com/mdjastrzebski/fs-fingerprint/issues/36)) ([764d0d5](https://github.com/mdjastrzebski/fs-fingerprint/commit/764d0d52b3cc62f97044a18684f1fa55407e40c3))

### 🛠️ Chores

- remove `p-limit` dependency ([#34](https://github.com/mdjastrzebski/fs-fingerprint/issues/34)) ([137db7d](https://github.com/mdjastrzebski/fs-fingerprint/commit/137db7d))

## [0.12.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.11.0...v0.12.0) (2025-09-28)

Updated public API.

Minimal migration guide:

- `include` => `files`
- `exclude` => `ignores`
- `extraInputs` => `contentInputs`
  - `{ key: "key", content: "text" }` => `textContent("key", "text")`
  - `{ key: "key", json: { ... } }` => `jsonContent("key", { ... })`

### ✨ Features

- env input ([#32](https://github.com/mdjastrzebski/fs-fingerprint/issues/32)) ([5011f12](https://github.com/mdjastrzebski/fs-fingerprint/commit/5011f121963783d5020c261732615c12a22044d0))
- (BREAKING) improve input API ([#33](https://github.com/mdjastrzebski/fs-fingerprint/issues/33)) ([4c5520c](https://github.com/mdjastrzebski/fs-fingerprint/commit/4c5520c60a41714a05f8c75c77a184fbdc4097b7))
- improve output API ([#31](https://github.com/mdjastrzebski/fs-fingerprint/issues/31)) ([e830916](https://github.com/mdjastrzebski/fs-fingerprint/commit/e83091640b450a89950193e033ed0525ec2a4d25))

## [0.11.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.10.0...v0.11.0) (2025-09-24)

### ✨ Features

- support cases for handling `include` (and git ignore) outside of `rootDir` ([#29](https://github.com/mdjastrzebski/fs-fingerprint/issues/29)) ([3e0fc42](https://github.com/mdjastrzebski/fs-fingerprint/commit/3e0fc423b49714ab7842a0c23caeb70733a748e2))
- windows support ([#30](https://github.com/mdjastrzebski/fs-fingerprint/issues/30)) ([c4b2c48](https://github.com/mdjastrzebski/fs-fingerprint/commit/c4b2c48c28789a9f6302c2f18ffeb84654266526))

## [0.10.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.9.0...v0.10.0) (2025-09-23)

### ✨ Features

- better git ignore ([#24](https://github.com/mdjastrzebski/fs-fingerprint/issues/24)) ([7156b59](https://github.com/mdjastrzebski/fs-fingerprint/commit/7156b59ea836ccca80cd64a3bba8bc03387d478a))

## [0.9.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.8.0...v0.9.0) (2025-09-18)

This release brings `include` option glob support, as well as large internal refactor that resulted in simpler and (10%) faster code.

### ✨ Features

- allow globs in `include` ([#19](https://github.com/mdjastrzebski/fs-fingerprint/issues/19)) ([2d69e97](https://github.com/mdjastrzebski/fs-fingerprint/commit/2d69e972a25d0f0ea6ed3cab8be50ed2b20ba81e))

## [0.8.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.7.0...v0.8.0) (2025-09-11)

### ✨ Features

- hashing algorithm improvements ([#18](https://github.com/mdjastrzebski/fs-fingerprint/issues/18)) ([0657092](https://github.com/mdjastrzebski/fs-fingerprint/commit/06570925daeab61f78c028aaa6c830437431fe1b))

## [0.7.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.6.0...v0.7.0) (2025-09-10)

_The GitHub release has no notes; entries below are from git history._

### 🛠️ Chores

- switch to precompiled picomatch ([#15](https://github.com/mdjastrzebski/fs-fingerprint/issues/15)) ([add775f](https://github.com/mdjastrzebski/fs-fingerprint/commit/add775f))

## [0.6.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.5.0...v0.6.0) (2025-09-07)

_No GitHub release was published for this version; entries below are from git history._

### ✨ Features

- support ignore file (e.g. `.gitignore`) ([#11](https://github.com/mdjastrzebski/fs-fingerprint/issues/11)) ([b74d9a4](https://github.com/mdjastrzebski/fs-fingerprint/commit/b74d9a4))

## [0.5.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.4.1...v0.5.0) (2025-09-06)

### ✨ Features

- support nested `include` paths ([#10](https://github.com/mdjastrzebski/fs-fingerprint/issues/10)) ([01cdd55](https://github.com/mdjastrzebski/fs-fingerprint/commit/01cdd55c9bbf3c419f70356498b62977049945d9))

## [0.4.1](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.4.0...v0.4.1) (2025-09-06)

### 🐛 Bug Fixes

- file matching algorithm by avoiding globs in `include` option ([#9](https://github.com/mdjastrzebski/fs-fingerprint/issues/9)) ([a87f676](https://github.com/mdjastrzebski/fs-fingerprint/commit/a87f67688b686919c51ba94a6498eb5fc4ade699))

## [0.4.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.3.0...v0.4.0) (2025-09-05)

### ✨ Features

- async API with limited concurrency ([#8](https://github.com/mdjastrzebski/fs-fingerprint/issues/8)) ([f5c983c](https://github.com/mdjastrzebski/fs-fingerprint/commit/f5c983ca5dc2dd35df810a025bf1d86146def35c))

## [0.3.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.2.0...v0.3.0) (2025-08-25)

### ✨ Features

- [BREAKING] streamline main api surface ([#4](https://github.com/mdjastrzebski/fs-fingerprint/pull/4))
- JSON input ([#5](https://github.com/mdjastrzebski/fs-fingerprint/issues/5)) ([65b10d7](https://github.com/mdjastrzebski/fs-fingerprint/commit/65b10d716ee14868971f10a02de5cac754e3d8a7))

## [0.2.0](https://github.com/mdjastrzebski/fs-fingerprint/compare/v0.1.0...v0.2.0) (2025-05-28)

### ✨ Features

- ignore paths ([#3](https://github.com/mdjastrzebski/fs-fingerprint/issues/3)) ([7b52477](https://github.com/mdjastrzebski/fs-fingerprint/commit/7b524772d93894036a7fa2c8334220e623739245))

## 0.1.0 (2025-05-27)

### ✨ Features

- v0 core features ([#2](https://github.com/mdjastrzebski/fs-fingerprint/issues/2)) ([ee77a62](https://github.com/mdjastrzebski/fs-fingerprint/commit/ee77a62095334a2a108be4fd084e6a325ea6dcb1))

### 📚 Documentation

- README ([ae3b45c](https://github.com/mdjastrzebski/fs-fingerprint/commit/ae3b45c3fa8f7bf167967345d32ab9108601966f))
