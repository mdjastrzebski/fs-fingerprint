import type { Config, ContentHash, Input } from "../types.js";
import { hashContent } from "../utils.js";

export function calculateContentHash(input: Input, config: Config): ContentHash {
  if ("content" in input) {
    return {
      key: input.key,
      hash: hashContent(input.content, config),
      content: input.content,
    };
  }

  if ("json" in input) {
    const content = safeJsonStringify(normalizeJson(input.json));
    return {
      key: input.key,
      hash: hashContent(content, config),
      content,
    };
  }

  if ("envs" in input) {
    const envJson: Record<string, string | undefined> = {};
    for (const key of input.envs) {
      envJson[key] = process.env[key] ?? "(undefined)";
    }

    const content = safeJsonStringify(normalizeJson(envJson));
    return {
      key: input.key,
      hash: hashContent(content, config),
      content,
    };
  }

  throw new Error(`Unsupported input type: ${JSON.stringify(input, null, 2)}`);
}

function normalizeJson<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeJson) as T;
  }

  const sortedKeys = Object.keys(value).sort();
  const result: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    result[key] = normalizeJson((value as Record<string, unknown>)[key]);
  }

  return result as T;
}

function safeJsonStringify(value: unknown): string {
  if (value === undefined) {
    return "(undefined)";
  }

  return JSON.stringify(value, null, 2);
}
