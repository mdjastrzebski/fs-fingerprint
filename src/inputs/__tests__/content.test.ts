import { describe, expect, test } from "bun:test";

import { EMPTY_HASH } from "../../constants.js";
import type { FingerprintConfig, FingerprintContentInput } from "../../types.js";
import { calculateContentHash } from "../content.js";

const baseConfig: FingerprintConfig = {
  rootDir: "not-used",
};

describe("calculateContentHash", () => {
  test("handles regular content", () => {
    const content: FingerprintContentInput = { key: "content-1", content: "Hello, world!" };

    const hash = calculateContentHash(content, baseConfig);
    expect(hash).toEqual({
      hash: "943a702d06f34599aee1f8da8ef9f7296031d699",
      key: "content:content-1",
      type: "content",
      content: "Hello, world!",
    });
  });

  test("handles null hash algorithm", () => {
    const content: FingerprintContentInput = { key: "content-1", content: "Hello, world!" };

    const testConfig = { ...baseConfig, hashAlgorithm: "null" };
    const hash = calculateContentHash(content, testConfig);
    expect(hash).toEqual({
      hash: EMPTY_HASH,
      key: "content:content-1",
      type: "content",
      content: "Hello, world!",
    });
  });
});
