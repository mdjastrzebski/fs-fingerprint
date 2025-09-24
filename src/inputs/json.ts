import type { DataHash, FingerprintConfig, FingerprintJsonInput } from "../types.js";
import { hashContent } from "../utils.js";

export function calculateJsonHash(
  input: FingerprintJsonInput,
  config: FingerprintConfig,
): DataHash {
  const normalizedData = normalizeObject(input.json);

  // JSON.stringify will return "undefined" for undefined values, instead of serializing them as "undefined"
  const jsonString = normalizedData === undefined ? "undefined" : JSON.stringify(normalizedData);

  return {
    key: input.key,
    hash: hashContent(jsonString, config),
    data: normalizedData,
  };
}

function normalizeObject<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeObject) as T;
  }

  const sortedKeys = Object.keys(value).sort();
  const result: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    result[key] = normalizeObject((value as Record<string, unknown>)[key]);
  }

  return result as T;
}
