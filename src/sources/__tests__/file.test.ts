import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import type { FingerprintConfig } from "../../types.js";
import { fileSource, hashFileSource } from "../file.js";

const config: FingerprintConfig = {
  rootDir: path.join(os.tmpdir(), "file-test"),
  excludes: [],
  hashAlgorithm: "sha1",
};

beforeEach(() => {
  if (fs.existsSync(config.rootDir)) {
    fs.rmSync(config.rootDir, { recursive: true });
  }

  fs.mkdirSync(config.rootDir, { recursive: true });
});

test("hash file source", () => {
  writeFile("test.txt", "Hello, world!");

  const fingerprint = hashFileSource(config, fileSource("test.txt"));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
      "source": {
        "key": "file:test.txt",
        "path": "test.txt",
        "type": "file",
      },
    }
  `);

  writeFile("test.txt", "Hello, there!");
  const fingerprint2 = hashFileSource(config, fileSource("test.txt"));
  expect(fingerprint2).toMatchInlineSnapshot(`
    {
      "hash": "f84640c76bd37e72446bc21d36613c3bb38dd788",
      "source": {
        "key": "file:test.txt",
        "path": "test.txt",
        "type": "file",
      },
    }
  `);
});

test("excludes ignored paths", () => {
  writeFile("test1.txt", "Hello, world!");
  writeFile("test2.txt", "Hello, there!");
  writeFile("test3.md", "Hello, other!");

  const config2: FingerprintConfig = {
    ...config,
    excludes: ["test2.txt", "*.md"],
  };

  const fingerprint1 = hashFileSource(config2, fileSource("test1.txt"));
  expect(fingerprint1).toMatchInlineSnapshot(`
    {
      "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
      "source": {
        "key": "file:test1.txt",
        "path": "test1.txt",
        "type": "file",
      },
    }
  `);

  const fingerprint2 = hashFileSource(config2, fileSource("test2.txt"));
  expect(fingerprint2).toMatchInlineSnapshot(`
    {
      "hash": null,
      "source": {
        "key": "file:test2.txt",
        "path": "test2.txt",
        "type": "file",
      },
    }
  `);

  const fingerprint3 = hashFileSource(config2, fileSource("test3.md"));
  expect(fingerprint3).toMatchInlineSnapshot(`
    {
      "hash": null,
      "source": {
        "key": "file:test3.md",
        "path": "test3.md",
        "type": "file",
      },
    }
  `);
});

function writeFile(filePath: string, content: string) {
  const absoluteFilePath = path.join(config.rootDir, filePath);
  const absoluteDirPath = path.dirname(absoluteFilePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absoluteFilePath, content);
}
