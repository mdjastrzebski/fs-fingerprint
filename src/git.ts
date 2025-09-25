import { execSync } from "node:child_process";
import * as nodePath from "node:path";
import { escapePath } from "tinyglobby";

export interface GetGitIgnoredPathsOptions {
  entireRepo?: boolean;
}

export function getGitIgnoredPaths(
  basePath: string,
  options?: GetGitIgnoredPathsOptions,
): string[] {
  const cwd = options?.entireRepo ? getGitRootPath(basePath) : basePath;

  try {
    const output = execSync("git ls-files -z --others --ignored --exclude-standard --directory", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    let result = output
      .split("\0")
      .filter(Boolean)
      .map((filePath) => escapePath(filePath));

    if (options?.entireRepo) {
      result = result.map((filePath) => remapPaths(filePath, cwd, basePath));
    }

    return result.sort();
  } catch (error) {
    const message = (error as Error)?.message || "Unknown error";
    throw new Error(`Failed to get git ignored files.\n\n${message}`, {
      cause: error,
    });
  }
}

function getGitRootPath(path: string): string {
  try {
    const output = execSync("git rev-parse --show-cdup", {
      cwd: path,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();

    return output ? nodePath.join(path, output) : path;
  } catch (error) {
    const message = (error as Error)?.message || "Unknown error";
    throw new Error(`Failed to get git root path.\n\n${message}`, {
      cause: error,
    });
  }
}

export function remapPaths(path: string, fromBase: string, toBase: string): string {
  const rebasedPath = nodePath
    .relative(toBase, nodePath.join(fromBase, path))
    .split(nodePath.sep)
    .join("/");
  if (path.endsWith("/") && !rebasedPath.endsWith("/")) {
    return `${rebasedPath}/`;
  }

  return rebasedPath;
}
