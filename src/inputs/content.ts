import type { Config, ContentHash, ContentInput } from "../types.js";
import { hashData } from "../utils.js";

export function calculateContentHash(input: ContentInput, config: Config): ContentHash {
  return {
    key: input.key,
    hash: hashData(input.content, config),
    content: input.secret ? undefined : input.content,
  };
}

export function textContent(
  key: string,
  text: string,
  options?: { secret?: boolean },
): ContentInput {
  return {
    key,
    content: text,
    secret: options?.secret,
  };
}

export function jsonContent(
  key: string,
  json: unknown,
  options?: { secret?: boolean },
): ContentInput {
  const content = safeJsonStringify(normalizeJson(json));
  return {
    key,
    content,
    secret: options?.secret,
  };
}

export function envContent(
  key: string,
  envs: string[],
  options?: { secret?: boolean },
): ContentInput {
  const envJson: Record<string, string | undefined> = {};
  for (const key of envs) {
    envJson[key] = process.env[key] ?? "";
  }

  return {
    key,
    content: safeJsonStringify(normalizeJson(envJson)),
    secret: options?.secret,
  };
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
