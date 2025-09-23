import { execSync } from "node:child_process";
import * as nodePath from "node:path";
import { escapePath } from "tinyglobby";

import { remapPaths } from "./utils.js";

export interface getGitIgnoredPathsOptions {
  outsidePaths?: boolean;
}

export function getGitIgnoredPaths(
  rootPath: string,
  options?: getGitIgnoredPathsOptions,
): string[] {
  const effectiveRootDir = options?.outsidePaths ? getGitRootPath(rootPath) : rootPath;

  try {
    const output = execSync("git ls-files -z --others --ignored --exclude-standard --directory", {
      cwd: effectiveRootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    let result = output
      .split("\0")
      .filter(Boolean)
      .map((path) => escapePath(path));

    if (options?.outsidePaths) {
      result = result.map((path) => remapPaths(path, effectiveRootDir, rootPath));
    }

    return result.sort();
  } catch (error) {
    const message = (error as Error)?.message || "Unknown error";
    throw new Error(`Failed to get git ignored files.\n\n${message}`, {
      cause: error,
    });
  }
}

function getGitRootPath(cwd: string): string {
  try {
    const output = execSync("git rev-parse --show-cdup", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (!output.trim()) {
      return cwd;
    }

    return nodePath.join(cwd, output || ".");
  } catch (error) {
    const message = (error as Error)?.message || "Unknown error";
    throw new Error(`Failed to get git root path.\n\n${message}`, {
      cause: error,
    });
  }
}
