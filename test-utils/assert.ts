import { type FingerprintInputHash } from "../src/index.js";
import { normalizeFilePath } from "../src/utils.js";

export function findInput(
  inputs: FingerprintInputHash[] | undefined,
  path: string,
): FingerprintInputHash | null {
  if (inputs == null) {
    return null;
  }

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
