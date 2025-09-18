import * as fs from "node:fs";
import * as os from "node:os";
import * as nodePath from "node:path";

/**
 * Create and initialize a temporary root directory for a test and return helpers bound to it.
 *
 * The directory is created under the OS temporary directory using `testName` as the final path segment.
 * The returned object includes:
 * - `rootDir`: absolute path to the created temporary directory.
 * - `prepareRootDir()`: removes the directory and its contents (if present) and recreates it.
 * - `writePaths(paths)`: create directories (paths ending with `/`) or files under the root according to the given relative paths.
 * - `writeFile(path, content?)`: write a file at the given relative path (creates parent directories); `content` defaults to `"Hello, world!"`.
 *
 * @param testName - Name to use for the temporary root directory (appended to the system temp path).
 * @returns An object exposing the `rootDir` path and helper functions scoped to that root directory.
 */
export function createRootDir(testName: string) {
  const rootDir = nodePath.join(os.tmpdir(), testName);

  fs.mkdirSync(rootDir, { recursive: true });

  return {
    rootDir,
    prepareRootDir: () => prepareRootDir(rootDir),
    writePaths: (paths: string[]) => writePaths(rootDir, paths),
    writeFile: (path: string, content?: string) => writeFile(rootDir, path, content),
  };
}

function writePaths(rootDir: string, paths: string[]) {
  paths.forEach((path) => {
    if (path.endsWith("/")) {
      fs.mkdirSync(nodePath.join(rootDir, path), { recursive: true });
    } else {
      writeFile(rootDir, path);
    }
  });
}

/**
 * Writes a file under `rootDir` at the given relative `path`, creating any missing parent directories.
 *
 * @param rootDir - Base directory used to resolve `path`.
 * @param path - File path relative to `rootDir`.
 * @param content - Content to write to the file. Defaults to `"Hello, world!"`.
 */
function writeFile(rootDir: string, path: string, content: string = "Hello, world!") {
  const absolutePath = nodePath.join(rootDir, path);
  const absoluteDirPath = nodePath.dirname(absolutePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

/**
 * Remove an existing directory and recreate it empty.
 *
 * Ensures `rootDir` does not exist afterwards except as a newly created empty directory.
 * If `rootDir` exists it is removed recursively before being recreated.
 *
 * @param rootDir - Filesystem path to the directory to reset
 */
function prepareRootDir(rootDir: string) {
  if (fs.existsSync(rootDir)) {
    fs.rmSync(rootDir, { recursive: true });
  }

  fs.mkdirSync(rootDir, { recursive: true });
}
