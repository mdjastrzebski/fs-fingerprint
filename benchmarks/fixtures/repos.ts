import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

export interface RepoConfig {
  name: string;
  url: string;
  description: string;
}

export const REPOS: RepoConfig[] = [
  {
    name: "express",
    url: "https://github.com/expressjs/express.git",
    description: "Fast, unopinionated web framework (~500 files)",
  },
  {
    name: "react-native",
    url: "https://github.com/facebook/react-native.git",
    description: "React Native framework (~5000+ files)",
  },
  {
    name: "expensify",
    url: "https://github.com/Expensify/App.git",
    description: "Expensify App",
  },
];

export class RepoManager {
  private reposDir: string;

  constructor(baseDir: string = join(process.cwd(), "benchmarks", "repos")) {
    this.reposDir = baseDir;
    mkdirSync(this.reposDir, { recursive: true });
  }

  /**
   * Clone a repository for benchmarking
   */
  async setupRepo(config: RepoConfig): Promise<string> {
    const repoPath = join(this.reposDir, config.name);

    if (!existsSync(repoPath)) {
      return this.cloneRepo(config);
    }

    return repoPath;
  }

  private cloneRepo(config: RepoConfig): string {
    const repoPath = join(this.reposDir, config.name);

    console.log(`⬇️ Cloning ${config.name}...`);

    try {
      const cloneCmd = `git clone --depth=1 "${config.url}" "${repoPath}"`;
      execSync(cloneCmd, { stdio: "pipe" });

      // Remove git history to save space
      rmSync(join(repoPath, ".git"), { recursive: true, force: true });

      console.log(`✅ ${config.name} cloned successfully`);
      return repoPath;
    } catch (error) {
      console.error(`❌ Failed to clone ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Get path to a cloned repository
   */
  getRepoPath(repoName: string): string {
    return join(this.reposDir, repoName);
  }

  /**
   * Check if a repository exists locally
   */
  hasRepo(repoName: string): boolean {
    return existsSync(this.getRepoPath(repoName));
  }

  /**
   * Setup all benchmark repositories
   */
  async setupAllRepos(): Promise<Map<string, string>> {
    const repoPaths = new Map<string, string>();

    console.log("🚀 Setting up benchmark repositories...");

    for (const config of REPOS) {
      try {
        const path = await this.setupRepo(config);
        repoPaths.set(config.name, path);
      } catch {
        console.error(`Failed to setup ${config.name}, skipping...`);
      }
    }

    console.log("✅ Benchmark repositories setup successfully");

    return repoPaths;
  }

  /**
   * Clean up all repositories
   */
  cleanup(): void {
    if (existsSync(this.reposDir)) {
      console.log("🧹 Cleaning up benchmark repositories...");
      rmSync(this.reposDir, { recursive: true });
    }
  }

  /**
   * Get repository configuration by name
   */
  getRepoConfig(name: string): RepoConfig | undefined {
    return REPOS.find((repo) => repo.name === name);
  }
}
