import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

import type { FingerprintConfig } from "../../types.js";
import { calculateContentHash } from "../content.js";

const config: FingerprintConfig = {
  rootDir: path.join(os.tmpdir(), "content-test"),
  exclude: [],
  hashAlgorithm: "sha1",
};

test("calculateContentHash", () => {
  const input = { key: "test", content: "Hello, world!" };
  const fingerprint = calculateContentHash(input, config);
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "content": "Hello, world!",
      "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
      "key": "content:test",
      "type": "content",
    }
  `);
});
