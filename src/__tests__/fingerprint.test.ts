import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import { EMPTY_HASH } from "../constants.js";
import { calculateFingerprint, calculateFingerprintSync } from "../index.js";
import type { FingerprintInputHash, FingerprintOptions, FingerprintResult } from "../types.js";
import { normalizeFilePath } from "../utils.js";

const rootDir = path.join(os.tmpdir(), "fingerprint-test");

beforeEach(() => {
  if (fs.existsSync(rootDir)) {
    fs.rmSync(rootDir, { recursive: true });
  }

  fs.mkdirSync(rootDir, { recursive: true });
});

test("calculate fingerprint all source types", async () => {
  writeFile("test1.txt");
  writeFile("test2.txt");
  writeFile("test3.txt");
  writeFile("dir/test4.txt");
  writeFile("dir2/nested/test5.txt");

  const options: FingerprintOptions = {
    extraInputs: [
      { key: "test-content", content: "Consectetur adipiscing elit" },
      { key: "test-json", json: { foo: "bar", baz: 123 } },
    ],
    hashAlgorithm: "sha1",
  };

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);

  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 161dd0513f211ca5f866f95c483f5b8628f33273
    Inputs:
      - CONTENT test-content - 3167fb5210b08f623c97f57ffb4903081ba4d6a5
      - DIRECTORY dir/ - f443674fae0a01bff6275a5905bb9d9b057dedab
          - FILE dir/test4.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir2/ - 37f999cffd4e4f6e2b0c232987070cbaacf81047
          - DIRECTORY dir2/nested/ - 5122f0891ddb28b59aa11cba7526cd225baa3d58
              - FILE dir2/nested/test5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE test2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE test3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - JSON test-json - 2e0706ddb09be38781b9b2bcc14c75d7b028ce61
    "
  `);
  expect(fingerprintSync).toEqual(fingerprint);
  expect(findInput(fingerprint.inputs, "test1.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "test2.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "test3.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir/")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir/test4.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir2/")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir2/nested/")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir2/nested/test5.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "test-content")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "test-json")).toBeTruthy();

  const options2: FingerprintOptions = {
    include: ["test1.txt", "test2.txt", "test3.txt", "dir", "dir2/"],
    extraInputs: [
      { key: "test-json", json: { baz: 123, foo: "bar" } },
      { key: "test-content", content: "Consectetur adipiscing elit" },
    ],
    hashAlgorithm: "sha1",
  };

  const fingerprintSync2 = calculateFingerprintSync(rootDir, options2);
  const fingerprint2 = await calculateFingerprint(rootDir, options2);
  expect(fingerprintSync2).toEqual(fingerprint2);
  expect(fingerprint2).toEqual(fingerprint);
});

test("calculate with basic include", async () => {
  writeFile("test1.txt");
  writeFile("dir1/test2.txt");
  writeFile("dir1/nested/test3.txt");
  writeFile("dir2/test4.txt");
  writeFile("dir3/test5.txt");
  writeFile("dir3/nested/test6.txt");

  const options: FingerprintOptions = {
    include: ["dir1", "dir2/", "dir3/nested/test.txt"],
    hashAlgorithm: "sha1",
  };

  const fingerprint = await calculateFingerprint(rootDir, options);
  const fingerprintSync = calculateFingerprintSync(rootDir, options);

  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 7906524b8144b61e805fae7e8e6e834b2ee08e23
    Inputs:
      - DIRECTORY dir1/ - 60b38207996aa6c2cf28575584ab1fdb593e3196
          - DIRECTORY dir1/nested/ - 0eecb966eb8b1cf04df1fc5482cd1007a0cbfeea
              - FILE dir1/nested/test3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
          - FILE dir1/test2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir2/ - 5e6e2c5cc1a58efaa6d6cb170cd962b3706af940
          - FILE dir2/test4.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);
  expect(fingerprintSync).toEqual(fingerprint);
});

test("calculate with nested include", async () => {
  writeFile("test0.txt");
  writeFile("dir1/test1.txt");
  writeFile("dir1/nested/test2.txt");
  writeFile("dir2/test3.txt");
  writeFile("dir2/nested/test4.txt");
  writeFile("dir3/test5.txt");
  writeFile("dir3/nested/test6.txt");

  const options: FingerprintOptions = {
    include: ["dir1", "dir2/", "dir3/nested/test6.txt"],
    hashAlgorithm: "sha1",
  };

  const fingerprint = await calculateFingerprint(rootDir, options);
  const fingerprintSync = calculateFingerprintSync(rootDir, options);

  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 09973524c16747b6fe9ea414a28624ed31be9786
    Inputs:
      - DIRECTORY dir1/ - 5a7bcd18e48a9a41d850bd563289c99f4a31f17b
          - DIRECTORY dir1/nested/ - baaef879143116824f5da067c17c3a8b591d0ec1
              - FILE dir1/nested/test2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
          - FILE dir1/test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir2/ - 4d9a94ac39aa42a87b6293d2d65eb1a18dd36851
          - DIRECTORY dir2/nested/ - b40d8fae2a419e2973dd41c8ecf8cfd44a981185
              - FILE dir2/nested/test4.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
          - FILE dir2/test3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE dir3/nested/test6.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);
  expect(fingerprintSync).toEqual(fingerprint);
  expect(findInput(fingerprint.inputs, "dir1/test1.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir1/nested/test2.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir2/test3.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir2/nested/test4.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir3/test5.txt")).toBeNull();
  expect(findInput(fingerprint.inputs, "dir3/nested/test6.txt")).toBeTruthy();
});

test("calculate with nested include", async () => {
  writeFile("test0.txt");
  writeFile("test1.txt");
  writeFile("dir1/test2.txt");
  writeFile("dir1/nested/test3.txt");
  writeFile("dir2/test4.txt");
  writeFile("dir2/nested/test5.txt");
  writeFile("dir3/test6.txt");
  writeFile("dir3/nested/test7.txt");
  writeFile("dir3/test8.txt");

  const options: FingerprintOptions = {
    include: ["test1.txt", "dir1", "dir2/nested", "dir3/nested/test7.txt"],
    hashAlgorithm: "sha1",
  };

  const fingerprint = await calculateFingerprint(rootDir, options);
  const fingerprintSync = calculateFingerprintSync(rootDir, options);

  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: af63c7de0376bae9ad9745aaa4f3e8de788f9217
    Inputs:
      - DIRECTORY dir1/ - 60b38207996aa6c2cf28575584ab1fdb593e3196
          - DIRECTORY dir1/nested/ - 0eecb966eb8b1cf04df1fc5482cd1007a0cbfeea
              - FILE dir1/nested/test3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
          - FILE dir1/test2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir2/nested/ - 5122f0891ddb28b59aa11cba7526cd225baa3d58
          - FILE dir2/nested/test5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE dir3/nested/test7.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);
  expect(fingerprintSync).toEqual(fingerprint);
  expect(findInput(fingerprint.inputs, "test1.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir1/test2.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir1/nested/test3.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir2/test4.txt")).toBeNull();
  expect(findInput(fingerprint.inputs, "dir2/nested/test5.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir3/test6.txt")).toBeNull();
  expect(findInput(fingerprint.inputs, "dir3/nested/test7.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir3/test8.txt")).toBeNull();
});

test("calculateFingerprint default include skips .files", async () => {
  writeFile("test1.txt");
  writeFile("dir1/test2.txt");
  writeFile(".test3.txt");
  writeFile(".dir2/nested/test4.txt");
  fs.mkdirSync(".dir3/nested", { recursive: true });

  fs.mkdirSync("dir1/nested", { recursive: true });
  const options: FingerprintOptions = {
    hashAlgorithm: "sha1",
  };

  const fingerprint = await calculateFingerprint(rootDir, options);
  const fingerprintSync = calculateFingerprintSync(rootDir, options);

  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 6831e3390a28e6b6b422e2651b1aae517dd1de67
    Inputs:
      - DIRECTORY dir1/ - 16fb434985da050fb4817367e33021796d07ab85
          - FILE dir1/test2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  expect(findInput(fingerprint.inputs, "test1.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir1/test2.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, ".test3.txt")).toBeNull();
  expect(findInput(fingerprint.inputs, ".dir2/nested/test4.txt")).toBeNull();
  expect(findInput(fingerprint.inputs, ".dir3/nested")).toBeNull();

  expect(fingerprintSync).toEqual(fingerprint);
});

test("calculate fingerprint with exclude", async () => {
  writeFile("test1.txt");
  writeFile("test2.md");
  writeFile("dir/test3.md");
  writeFile("ignore/test.txt");

  const options: FingerprintOptions = {
    exclude: ["ignore", "*.md"],
    hashAlgorithm: "sha1",
  };

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);
  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 66c493c65fc2c1721b3b2f1500842c2847b4a70c
    Inputs:
      - DIRECTORY dir/ - a9064391c3bc49a6cea75d15073442b4457b287d
          - FILE dir/test3.md - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);
  expect(fingerprintSync).toEqual(fingerprint);

  const options2: FingerprintOptions = {
    include: ["test1.txt", "test2.md"],
    exclude: ["ignore", "*.txt"],
    hashAlgorithm: "sha1",
  };

  const fingerprintSync2 = calculateFingerprintSync(rootDir, options2);
  const fingerprint2 = await calculateFingerprint(rootDir, options2);
  expect(formatFingerprint(fingerprint2)).toMatchInlineSnapshot(`
    "Hash: 15fa3ee324c36f2be3aa61e7b4c01f0a4a3bde65
    Inputs:
      - FILE test2.md - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);
  expect(fingerprintSync2).toEqual(fingerprint2);
});

test("calculate fingerprint with include and exclude", async () => {
  writeFile("test0.txt");
  writeFile("test1.txt");
  writeFile("dir/test1.txt");
  writeFile("dir/test3.md");
  writeFile("dir/nested/test4.txt");
  writeFile("dir/nested/test5.md");
  writeFile("ignore/test6.txt");

  const options: FingerprintOptions = {
    include: ["test1.txt", "dir"],
    exclude: ["**/*.md"],
    hashAlgorithm: "sha1",
  };

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);
  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 0a5025899e7a46d4eac5e2ad04654545cc5ab107
    Inputs:
      - DIRECTORY dir/ - 33dbab09a5eb38ea1538de41f3dd9e4b29c3a4b8
          - DIRECTORY dir/nested/ - a048684ad348be9abbddcab4878ba0c3445ad221
              - FILE dir/nested/test4.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
          - FILE dir/test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);
  expect(fingerprintSync).toEqual(fingerprint);
});

test("calculate fingerprint ignores empty directory", async () => {
  writeFile("test1.txt");
  fs.mkdirSync("dir2", { recursive: true });
  writeFile("dir3/test2.txt");
  fs.mkdirSync("dir3/nested", { recursive: true });

  const options: FingerprintOptions = {
    include: ["test1.txt", "dir2/", "dir3/"],
    hashAlgorithm: "sha1",
  };

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);
  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: bdf2872b4e39b98c9ab1ee075dbd1fe429ee7011
    Inputs:
      - DIRECTORY dir3/ - cd3751afade56310c244e71784c48ecdbfd8cdea
          - FILE dir3/test2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);
  expect(findInput(fingerprint.inputs, "test1.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir2")).toBeNull();
  expect(findInput(fingerprint.inputs, "dir3/test2.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir3/nested")).toBeNull();

  expect(fingerprintSync).toEqual(fingerprint);
});

test("calculate fingerprint with dir path for file", async () => {
  writeFile("test1.txt");
  writeFile("test2.txt");
  writeFile("test3.md");
  writeFile("dir/test4.txt");
  writeFile("dir2/test5.md");
  fs.mkdirSync("dir3/deeply/nested", { recursive: true });

  const options: FingerprintOptions = {
    include: ["test1.txt", "test2.txt/", "test3.md", "dir/test4.txt", "dir2"],
    exclude: ["**/*.md"],
    hashAlgorithm: "sha1",
  };

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);
  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 9d35a0d61da1e472219da1b083f43f2a41eead9c
    Inputs:
      - FILE dir/test4.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);
  expect(findInput(fingerprint.inputs, "test1.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "test2.txt")).toBeNull();
  expect(findInput(fingerprint.inputs, "test3.md")).toBeNull();
  expect(findInput(fingerprint.inputs, "dir/test4.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir2/")).toBeNull();
  expect(findInput(fingerprint.inputs, "dir2/test5.md")).toBeNull();
  expect(findInput(fingerprint.inputs, "dir3/deeply/nested")).toBeNull();

  expect(fingerprintSync).toEqual(fingerprint);
});

test("calculate fingerprint supports .gitignore", async () => {
  writeFile("test1.txt");
  writeFile("dir/test2.txt");
  writeFile("dir/test3.md");
  writeFile("dir/test4.ts");
  writeFile("dir/nested/test5.txt");
  writeFile("dir/nested/test6.md");
  writeFile(".gitignore", "**/*.md");

  const options: FingerprintOptions = {
    include: ["test1.txt", "dir"],
    exclude: ["**/*.ts"],
    hashAlgorithm: "sha1",
    ignoreFilePath: ".gitignore",
  };

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);
  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 3623fac938d0d6a20d91b76a391eb6fe3f510ffb
    Inputs:
      - DIRECTORY dir/ - 4007a58166ef7a82f50066a73952f031199aee71
          - DIRECTORY dir/nested/ - 75dc76fc81ca621af19f10d0b04f574f5cc1f7e9
              - FILE dir/nested/test5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
          - FILE dir/test2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  expect(fingerprintSync).toEqual(fingerprint);
  expect(findInput(fingerprint.inputs, "test1.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir/test2.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir/test3.md")).toBeNull(); // .gitignore
  expect(findInput(fingerprint.inputs, "dir/test4.ts")).toBeNull(); // exclude option
  expect(findInput(fingerprint.inputs, "dir/nested/test5.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir/nested/test6.md")).toBeNull(); // .gitignore
});

test("calculateFingerprint handles non-existent .gitignore", async () => {
  writeFile("test1.txt");

  const options: FingerprintOptions = {
    hashAlgorithm: "sha1",
    ignoreFilePath: ".gitignore",
  };

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);
  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 142fa232afb866d394ab59fef182fd20ac591989
    Inputs:
      - FILE test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  expect(fingerprintSync).toEqual(fingerprint);
  expect(findInput(fingerprint.inputs, "test1.txt")).toBeTruthy();
});

test("calculateFingerprint handles null result", async () => {
  const options: FingerprintOptions = {
    include: [],
    hashAlgorithm: "sha1",
  };

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);
  expect(fingerprint).toEqual({
    hash: EMPTY_HASH,
    inputs: [],
  });

  expect(fingerprintSync).toEqual(fingerprint);
});

function writeFile(filePath: string, content: string = "Hello, world!") {
  const absoluteFilePath = path.join(rootDir, filePath);
  const absoluteDirPath = path.dirname(absoluteFilePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absoluteFilePath, content);
}

function formatFingerprint(fingerprint: FingerprintResult): string {
  let result = `Hash: ${fingerprint.hash}\n`;
  result += `Inputs:\n`;
  result += formatInputs(fingerprint.inputs, 2);
  return result;
}

function formatInputs(inputs: FingerprintInputHash[], indent = 0): string {
  let result = "";
  for (const input of inputs) {
    const name = input.key.split(":")[1];

    result += `${" ".repeat(indent)}- ${input.type.toUpperCase()} ${name} - ${input.hash}\n`;
    if (input.type === "directory") {
      result += formatInputs(input.children, indent + 4);
    }
  }

  return result;
}

function findInput(inputs: FingerprintInputHash[], path: string): FingerprintInputHash | null {
  const pathComponents = normalizeFilePath(path).split("/").filter(Boolean);

  const exactMatch = inputs.find((input) => input.key.split(":")[1] === path);
  if (exactMatch) {
    return exactMatch;
  }

  for (let depth = 0; depth < pathComponents.length; depth += 1) {
    const partialPath = pathComponents.slice(0, depth + 1).join("/");
    const partialMatch = inputs.find((input) => input.key.split(":")[1] === `${partialPath}/`);
    if (partialMatch?.type === "directory") {
      const childMatch = findInput(partialMatch.children, path);
      if (childMatch) {
        return childMatch;
      }
    }
  }

  return null;
}
