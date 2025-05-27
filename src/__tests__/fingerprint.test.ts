import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import {
  calculateFingerprint,
  hashContentSource,
  hashDirectorySource,
  hashFileSource,
} from "../fingerprint.js";
import { contentSource, directorySource, fileSource } from "../sources.js";
import type { FingerprintConfig } from "../types.js";

const config: FingerprintConfig = {
  rootDir: path.join(os.tmpdir(), "fingerprint-test"),
  ignorePaths: [],
  hashAlgorithm: "sha256",
};

beforeEach(() => {
  if (fs.existsSync(config.rootDir)) {
    fs.rmSync(config.rootDir, { recursive: true });
  }

  fs.mkdirSync(config.rootDir, { recursive: true });
});

test("hash content source", () => {
  const fingerprint = hashContentSource(config, contentSource("test", "Hello, world!"));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "hash": "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3",
      "source": {
        "content": "Hello, world!",
        "key": "content:test",
        "type": "content",
      },
    }
  `);
});

test("hash file source", () => {
  writeFile("test.txt", "Hello, world!");

  const fingerprint = hashFileSource(config, fileSource("test.txt"));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "hash": "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3",
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
      "hash": "1f4b69278ceb447d784c9edbd054cb4377b658c3f8f0a6a330b90fa63fd7a5d9",
      "source": {
        "key": "file:test.txt",
        "path": "test.txt",
        "type": "file",
      },
    }
  `);
});

test("hash directory source", () => {
  writeFile("test-dir/test.txt", "Hello, world!");

  const fingerprint = hashDirectorySource(config, directorySource("test-dir"));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "children": [
        {
          "hash": "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3",
          "source": {
            "key": "file:test-dir/test.txt",
            "path": "test-dir/test.txt",
            "type": "file",
          },
        },
      ],
      "hash": "044caec508794359b31b7f22ec00548db904ef6079989fca634af8a53d425ede",
      "source": {
        "key": "directory:test-dir",
        "path": "test-dir",
        "type": "directory",
      },
    }
  `);
});

test("hash directory source with nesting", () => {
  writeFile("test-dir/test.txt", "Hello, world!");
  writeFile("test-dir/nested/test.txt", "Hello, there!");

  const fingerprint = hashDirectorySource(config, directorySource("test-dir"));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "children": [
        {
          "children": [
            {
              "hash": "1f4b69278ceb447d784c9edbd054cb4377b658c3f8f0a6a330b90fa63fd7a5d9",
              "source": {
                "key": "file:test-dir/nested/test.txt",
                "path": "test-dir/nested/test.txt",
                "type": "file",
              },
            },
          ],
          "hash": "a310a4ab52e1f9b681b1972381b9431b98df8a20c4eaba1c51fe7ed2ca5df438",
          "source": {
            "key": "directory:test-dir/nested",
            "path": "test-dir/nested",
            "type": "directory",
          },
        },
        {
          "hash": "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3",
          "source": {
            "key": "file:test-dir/test.txt",
            "path": "test-dir/test.txt",
            "type": "file",
          },
        },
      ],
      "hash": "a69ccfc88bd1449c42f5ee43c502fb2f56b187601762a617a313dd6a0ffdebda",
      "source": {
        "key": "directory:test-dir",
        "path": "test-dir",
        "type": "directory",
      },
    }
  `);
});

test("calculate fingerprint", () => {
  writeFile("test1.txt", "Hello, world!");
  writeFile("test2.txt", "Lorem Ipsum");
  writeFile("test3.txt", "Dolor sit amet");
  writeFile("test-dir/test.txt", "Hello, there!");
  writeFile("test-dir/nested/test.txt", "Sed do eiusmod tempor");

  const fingerprint = calculateFingerprint({
    ...config,
    sources: [
      contentSource("test4", "Consectetur adipiscing elit"),
      directorySource("test-dir"),
      fileSource("test1.txt"),
      fileSource("test2.txt"),
      fileSource("test3.txt"),
    ],
  });

  expect(fingerprint.hash).toMatchInlineSnapshot(
    `"b29642665281ca4daec870e64e62833053973297c6b84dae04ba84c42fdc143a"`
  );

  const fingerprint2 = calculateFingerprint({
    ...config,
    sources: [
      fileSource("test3.txt"),
      directorySource("test-dir"),
      fileSource("test1.txt"),
      contentSource("test4", "Consectetur adipiscing elit"),
      fileSource("test2.txt"),
    ],
  });
  expect(fingerprint2.hash).toEqual(fingerprint.hash);
});

function writeFile(filePath: string, content: string) {
  const absoluteFilePath = path.join(config.rootDir, filePath);
  const absoluteDirPath = path.dirname(absoluteFilePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absoluteFilePath, content);
}
