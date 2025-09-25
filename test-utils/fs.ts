import * as fs from "node:fs";
import * as os from "node:os";
import * as nodePath from "node:path";

export function createRootDir(testName: string) {
  const basePath = nodePath.join(os.tmpdir(), testName);
  fs.mkdirSync(basePath, { recursive: true });

  return {
    basePath,
    prepareRootDir: () => prepareRootDir(basePath),
    writePaths: (paths: string[]) => writePaths(basePath, paths),
    writeFile: (path: string, content?: string) => writeFile(basePath, path, content),
    debug: () => debug(basePath),
  };
}

function writePaths(basePath: string, paths: string[]) {
  paths.forEach((path) => {
    if (path.endsWith("/")) {
      fs.mkdirSync(nodePath.join(basePath, path), { recursive: true });
    } else {
      writeFile(basePath, path);
    }
  });
}

function writeFile(basePath: string, path: string, content: string = "Hello, world!") {
  const absolutePath = nodePath.join(basePath, path);
  const absoluteDirPath = nodePath.dirname(absolutePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

function prepareRootDir(basePath: string) {
  if (fs.existsSync(basePath)) {
    fs.rmSync(basePath, { recursive: true });
  }

  fs.mkdirSync(basePath, { recursive: true });
}

function debug(basePath: string) {
  function printDir(dir: string, prefix: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = nodePath.join(dir, entry.name);
      console.log(`${prefix}${entry.name}`);
      if (entry.isDirectory()) {
        printDir(fullPath, `${prefix}  `);
      }
    });
  }

  printDir(basePath, "");
}
