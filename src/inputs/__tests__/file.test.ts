import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import { EMPTY_HASH } from "../../constants.js";
import type { FingerprintConfig } from "../../types.js";
import { calculateFileHash, calculateFileHashSync } from "../file.js";

const config: FingerprintConfig = {
  rootDir: path.join(os.tmpdir(), "file-test"),
  exclude: [],
  hashAlgorithm: "sha1",
};

beforeEach(() => {
  if (fs.existsSync(config.rootDir)) {
    fs.rmSync(config.rootDir, { recursive: true });
  }

  fs.mkdirSync(config.rootDir, { recursive: true });
});

test("hash file input", async() => {
  writeFile("test.txt", "Hello, world!");

  const fingerprintSync = calculateFileHashSync("test.txt", config);
  const fingerprint = await calculateFileHash("test.txt", config);
  expect(fingerprintSync).toEqual(fingerprint);
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
      "key": "file:test.txt",
      "path": "test.txt",
      "type": "file",
    }
  `);

  writeFile("test.txt", "Hello, there!");
  const fingerprintSync2 = calculateFileHashSync("test.txt", config);
  const fingerprint2 = await calculateFileHash("test.txt", config);
  expect(fingerprintSync2).toEqual(fingerprint2);
  expect(fingerprint2).toMatchInlineSnapshot(`
    {
      "hash": "f84640c76bd37e72446bc21d36613c3bb38dd788",
      "key": "file:test.txt",
      "path": "test.txt",
      "type": "file",
    }
  `);
});

test("excludes ignored paths", async () => {
  writeFile("test1.txt", "Hello, world!");
  writeFile("test2.txt", "Hello, there!");
  writeFile("test3.md", "Hello, other!");

  const config2: FingerprintConfig = {
    ...config,
    exclude: ["test2.txt", "*.md"],
  };

  const fingerprintSync1 = calculateFileHashSync("test1.txt", config2);
  const fingerprint1 = await calculateFileHash("test1.txt", config2);
  expect(fingerprintSync1).toEqual(fingerprint1);
  expect(fingerprint1).toMatchInlineSnapshot(`
    {
      "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
      "key": "file:test1.txt",
      "path": "test1.txt",
      "type": "file",
    }
  `);

  const fingerprintSync2 = calculateFileHashSync("test2.txt", config2);
  const fingerprint2 = await calculateFileHash("test2.txt", config2);
  expect(fingerprintSync2).toEqual(fingerprint2);
  expect(fingerprint2).toMatchInlineSnapshot(`null`);

  const fingerprintSync3 = calculateFileHashSync("test3.md", config2);
  const fingerprint3 = await calculateFileHash("test3.md", config2);
  expect(fingerprintSync3).toEqual(fingerprint3);
  expect(fingerprint3).toMatchInlineSnapshot(`null`);
});

test("respects null hash algorithm", async () => {
  writeFile("test.txt", "Hello, world!");
  const config2: FingerprintConfig = {
    ...config,
    hashAlgorithm: "null",
  };

  const hash = await calculateFileHash("test.txt", config2);
  const hashSync = calculateFileHashSync("test.txt", config2);
  expect(hash).toEqual(hashSync);
  expect(hash?.hash).toBe(EMPTY_HASH);
});

function writeFile(filePath: string, content: string) {
  const absoluteFilePath = path.join(config.rootDir, filePath);
  const absoluteDirPath = path.dirname(absoluteFilePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absoluteFilePath, content);
}
