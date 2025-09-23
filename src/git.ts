import { execSync } from "node:child_process";
import { escapePath } from "tinyglobby";

export function getGitIgnoredPaths(rootPath: string): string[] {
  try {
    const output = execSync("git ls-files -z --others --ignored --exclude-standard --directory", {
      cwd: rootPath,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return output
      .split("\0")
      .filter(Boolean)
      .map((p) => escapePath(p))
      .sort();
  } catch (error) {
    const message = (error as Error)?.message || "Unknown error";
    throw new Error(`Failed to get git ignored files.\n\n${message}`, {
      cause: error,
    });
  }
}
