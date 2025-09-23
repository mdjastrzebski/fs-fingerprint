import { execSync } from "node:child_process";
import { escapePath } from "tinyglobby";

import { getEffectiveRootDir, remapPaths } from "./utils.js";

export function getGitIgnoredPaths(rootPath: string, include: string[]): string[] {
  try {
    const effectiveRootDir = getEffectiveRootDir(rootPath, include);
    console.log("Root path:", rootPath);
    console.log("Effective root dir:", effectiveRootDir);
    const output = execSync("git ls-files -z --others --ignored --exclude-standard --directory", {
      cwd: effectiveRootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return output
      .split("\0")
      .filter(Boolean)
      .map((p) => remapPaths(escapePath(p), effectiveRootDir, rootPath))
      .sort();
  } catch (error) {
    const message = (error as Error)?.message || "Unknown error";
    throw new Error(`Failed to get git ignored files.\n\n${message}`, {
      cause: error,
    });
  }
}
