import * as fs from "node:fs";
import * as os from "node:os";
import * as nodePath from "node:path";

export function createRootDir(testName: string) {
  const rootDir = nodePath.join(os.tmpdir(), testName);

  fs.mkdirSync(rootDir, { recursive: true });

  return {
    rootDir,
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

function writeFile(rootDir: string, path: string, content: string = "Hello, world!") {
  const absolutePath = nodePath.join(rootDir, path);
  const absoluteDirPath = nodePath.dirname(absolutePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absolutePath, content);
}
