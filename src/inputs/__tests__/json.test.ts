import { describe, expect, it } from "vitest";

import type { FingerprintConfig } from "../../types.js";
import { hashJson, jsonInput } from "../json.js";

const config: FingerprintConfig = {
  rootDir: "/test",
  hashAlgorithm: "sha256",
};

describe("jsonInput", () => {
  it("should create a json input with correct type and key prefix", () => {
    const input = jsonInput("test", { foo: "bar" });
    expect(input).toEqual({
      type: "json",
      key: "json:test",
      data: { foo: "bar" },
    });
  });
});

describe("hashJson", () => {
  it("should produce the same hash for objects with different key orders", () => {
    const obj1 = { b: 2, a: 1, c: 3 };
    const obj2 = { a: 1, c: 3, b: 2 };
    const obj3 = { c: 3, b: 2, a: 1 };

    const input1 = jsonInput("test", obj1);
    const input2 = jsonInput("test", obj2);
    const input3 = jsonInput("test", obj3);

    const hash1 = hashJson(config, input1);
    const hash2 = hashJson(config, input2);
    const hash3 = hashJson(config, input3);

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

    const input1 = jsonInput("test", obj1);
    const input2 = jsonInput("test", obj2);

    const hash1 = hashJson(config, input1);
    const hash2 = hashJson(config, input2);

    expect(hash1.hash).toBe(hash2.hash);
  });

  it("should produce different hashes for different values", () => {
    const input1 = jsonInput("test", { a: 1 });
    const input2 = jsonInput("test", { a: 2 });

    const hash1 = hashJson(config, input1);
    const hash2 = hashJson(config, input2);

    expect(hash1.hash).not.toBe(hash2.hash);
  });

  it("should handle primitive values", () => {
    const input1 = jsonInput("test", "string");
    const input2 = jsonInput("test", 42);
    const input3 = jsonInput("test", true);
    const input4 = jsonInput("test", null);

    const hash1 = hashJson(config, input1);
    const hash2 = hashJson(config, input2);
    const hash3 = hashJson(config, input3);
    const hash4 = hashJson(config, input4);

    expect(hash1.hash).toBeDefined();
    expect(hash2.hash).toBeDefined();
    expect(hash3.hash).toBeDefined();
    expect(hash4.hash).toBeDefined();

    expect(hash1.hash).not.toBe(hash2.hash);
    expect(hash2.hash).not.toBe(hash3.hash);
    expect(hash3.hash).not.toBe(hash4.hash);
  });

  it("should handle arrays", () => {
    const input1 = jsonInput("test", [3, 1, 2]);
    const input2 = jsonInput("test", [1, 2, 3]);

    const hash1 = hashJson(config, input1);
    const hash2 = hashJson(config, input2);

    expect(hash1.hash).not.toBe(hash2.hash);
  });

  it("should preserve the original input data in the result", () => {
    const data = { b: 2, a: 1 };
    const input = jsonInput("test", data);
    const result = hashJson(config, input);

    expect(result.type).toBe("json");
    expect(result.key).toBe("json:test");
    expect(result.data).toBe(data);
    expect(result.hash).toBeDefined();
  });
});
