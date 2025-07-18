import { describe, expect, it } from "vitest";

import type { FingerprintConfig } from "../../types.js";
import { calculateJsonHash } from "../json.js";

const config: FingerprintConfig = {
  rootDir: "/test",
  hashAlgorithm: "sha256",
};

describe("calculateJsonHash", () => {
  it("should produce the same hash for objects with different key orders", () => {
    const input1 = { key: "test", json: { b: 2, a: 1, c: 3 } };
    const input2 = { key: "test", json: { a: 1, c: 3, b: 2 } };
    const input3 = { key: "test", json: { c: 3, b: 2, a: 1 } };

    const hash1 = calculateJsonHash(input1, config);
    const hash2 = calculateJsonHash(input2, config);
    const hash3 = calculateJsonHash(input3, config);

    expect(hash1.hash).toBe(hash2.hash);
    expect(hash2.hash).toBe(hash3.hash);
  });

  it("should produce the same hash for nested objects with different key orders", () => {
    const obj1 = {
      outer: { b: 2, a: 1 },
      array: [{ z: 26, y: 25 }],
    };
    const obj2 = {
      array: [{ y: 25, z: 26 }],
      outer: { a: 1, b: 2 },
    };

    const input1 = { key: "test", json: obj1 };
    const input2 = { key: "test", json: obj2 };

    const hash1 = calculateJsonHash(input1, config);
    const hash2 = calculateJsonHash(input2, config);

    expect(hash1.hash).toBe(hash2.hash);
  });

  it("should produce different hashes for different values", () => {
    const input1 = { key: "test", json: { a: 1 } };
    const input2 = { key: "test", json: { a: 2 } };

    const hash1 = calculateJsonHash(input1, config);
    const hash2 = calculateJsonHash(input2, config);

    expect(hash1.hash).not.toBe(hash2.hash);
  });

  it("should handle primitive values", () => {
    const input1 = { key: "test", json: "string" };
    const input2 = { key: "test", json: 42 };
    const input3 = { key: "test", json: true };
    const input4 = { key: "test", json: null };

    const hash1 = calculateJsonHash(input1, config);
    const hash2 = calculateJsonHash(input2, config);
    const hash3 = calculateJsonHash(input3, config);
    const hash4 = calculateJsonHash(input4, config);

    expect(hash1.hash).toBeDefined();
    expect(hash2.hash).toBeDefined();
    expect(hash3.hash).toBeDefined();
    expect(hash4.hash).toBeDefined();

    expect(hash1.hash).not.toBe(hash2.hash);
    expect(hash2.hash).not.toBe(hash3.hash);
    expect(hash3.hash).not.toBe(hash4.hash);
  });

  it("should handle arrays", () => {
    const input1 = { key: "test", json: [3, 1, 2] };
    const input2 = { key: "test", json: [1, 2, 3] };

    const hash1 = calculateJsonHash(input1, config);
    const hash2 = calculateJsonHash(input2, config);

    expect(hash1.hash).not.toBe(hash2.hash);
  });

  it("should preserve the original input data in the result", () => {
    const data = { b: 2, a: 1 };
    const input = { key: "test", json: data };
    const result = calculateJsonHash(input, config);

    expect(result.type).toBe("json");
    expect(result.key).toBe("json:test");
    expect(result.json).toEqual(data);
    expect(result.hash).toMatchInlineSnapshot(`"43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777"`);
  });
});
