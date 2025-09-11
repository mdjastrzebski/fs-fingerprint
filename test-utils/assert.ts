import { type FingerprintInputHash } from "../src/index.js";
import { normalizeFilePath } from "../src/utils.js";

export function findInput(
  inputs: FingerprintInputHash[] | undefined,
  path: string,
): FingerprintInputHash | null {
  if (inputs == null) {
    return null;
  }

  const exactMatch = inputs.find((input) => input.key.split(":")[1] === path);
  if (exactMatch) {
    return exactMatch;
  }

  const pathComponents = normalizeFilePath(path).split("/").filter(Boolean);
  for (let depth = 0; depth < pathComponents.length; depth += 1) {
    const frontPath = pathComponents.slice(0, depth + 1).join("/");
    const frontMatch = inputs.find((input) => input.key.split(":")[1] === `${frontPath}/`);
    if (frontMatch?.type === "directory") {
      const restPath = pathComponents.slice(depth + 1).join("/") + (path.endsWith("/") ? "/" : "");
      const childMatch = findInput(frontMatch.children, restPath);
      if (childMatch) {
        return childMatch;
      }
    }
  }

  return null;
}
