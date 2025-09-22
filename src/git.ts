import { execSync } from "node:child_process";
import { escapePath } from "tinyglobby";

export function getGitIgnoredFiles(cwd: string): string[] {
  try {
    const output = execSync(
      "git ls-files -z --others --ignored --exclude-standard --directory --full-name",
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    return output
      .split("\0")
      .filter(Boolean)
      .map((p) => escapePath(p));
  } catch (error) {
    const message = (error as Error)?.message || "Unknown error";
    throw new Error(`Failed to get git ignored files.\n\n${message}`, {
      cause: error,
    });
  }
}
