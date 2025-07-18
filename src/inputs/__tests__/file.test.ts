import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import type { FingerprintConfig } from "../../types.js";
import { calculateFileHash } from "../file.js";

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

test("hash file input", () => {
  writeFile("test.txt", "Hello, world!");

  const fingerprint = calculateFileHash("test.txt", config);
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
      "key": "file:test.txt",
      "path": "test.txt",
      "type": "file",
    }
  `);

  writeFile("test.txt", "Hello, there!");
  const fingerprint2 = calculateFileHash("test.txt", config);
  expect(fingerprint2).toMatchInlineSnapshot(`
    {
      "hash": "f84640c76bd37e72446bc21d36613c3bb38dd788",
      "key": "file:test.txt",
      "path": "test.txt",
      "type": "file",
    }
  `);
});

test("excludes ignored paths", () => {
  writeFile("test1.txt", "Hello, world!");
  writeFile("test2.txt", "Hello, there!");
  writeFile("test3.md", "Hello, other!");

  const config2: FingerprintConfig = {
    ...config,
    exclude: ["test2.txt", "*.md"],
  };

  const fingerprint1 = calculateFileHash("test1.txt", config2);
  expect(fingerprint1).toMatchInlineSnapshot(`
    {
      "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
      "key": "file:test1.txt",
      "path": "test1.txt",
      "type": "file",
    }
  `);

  const fingerprint2 = calculateFileHash("test2.txt", config2);
  expect(fingerprint2).toMatchInlineSnapshot(`null`);

  const fingerprint3 = calculateFileHash("test3.md", config2);
  expect(fingerprint3).toMatchInlineSnapshot(`null`);
});

function writeFile(filePath: string, content: string) {
  const absoluteFilePath = path.join(config.rootDir, filePath);
  const absoluteDirPath = path.dirname(absoluteFilePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absoluteFilePath, content);
}
