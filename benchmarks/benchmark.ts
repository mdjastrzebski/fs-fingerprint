import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
import { Bench } from "tinybench";
import * as md from "ts-markdown-builder";

import {
  calculateFingerprint,
  calculateFingerprintSync,
  type FingerprintOptions,
} from "../src/index.js";
import { RepoManager } from "./fixtures/repos.js";
import { EXPENSIFY_ROCK_CONFIG, getRockFingerprintOptions } from "./fixtures/rock.js";

const BENCHMARK_DIR = ".benchmark";
const type = process.argv.includes("--baseline") ? "baseline" : "current";
const otherType = type === "baseline" ? "current" : "baseline";

/**
 * Changes within this multiple of the larger MAD, or below this percentage, are marked as noise.
 * The percentage floor covers drift between runs, which the MAD of a single run does not capture.
 */
const NOISE_MAD_FACTOR = 2;
const NOISE_MIN_PERCENT = 5;

interface PerformanceResults {
  timestamp: string;
  /** Optional, as results saved by older versions lack it */
  environment?: BenchmarkEnvironment;
  benchmarks: BenchmarkResult[];
}

interface BenchmarkEnvironment {
  os: string;
  arch: string;
  cpu: string;
  cpuCount: number;
  node: string;
  uvThreadpoolSize: string;
}

interface BenchmarkResult {
  name: string;
  latency: {
    p50: number;
    mad: number;
    min: number;
    max: number;
    p99: number;
    samples: number;
  };
  throughput: {
    p50: number;
    mad: number;
    min: number;
    max: number;
    p99: number;
    samples: number;
  };
  totalTime: number;
}

async function runBenchmarks(): Promise<void> {
  const repoManager = new RepoManager();
  const repoPaths = await repoManager.setupAllRepos();

  const bench = new Bench({
    name: "fs-fingerprint performance benchmarks",
    time: 500, // Run for 500 ms
    iterations: 10,
  });

  setupBenchmarks(bench, repoPaths);

  console.log("⏱️  Running benchmarks...");
  await bench.run();

  console.log(`\n✅ Benchmark Results (${formatEnvironment(getEnvironment())}):`);
  console.log(
    md.table(
      ["Task name", "Latency med (ms)", "Throughput med (ops/s)", "Samples"],
      buildResultsTable(bench),
    ),
  );

  // Write machine-readable JSON output
  const results = buildResults(bench);
  const resultsPath = join(BENCHMARK_DIR, `${type}.json`);
  savePerformanceResults(resultsPath, results);
  console.log(`\n🔗 Saved performance results: ${resultsPath}`);

  // If not baseline mode, compare with baseline if it exists
  const otherPath = join(BENCHMARK_DIR, `${otherType}.json`);
  if (!existsSync(otherPath)) {
    console.warn(`No ${otherType} results found at ${otherPath}, skipping comparison.`);
    return;
  }

  const otherResults = loadPerformanceResults(otherPath);
  console.log(`🔗 Loaded ${otherType} results: ${otherPath}`);

  const baselineResults = type === "baseline" ? results : otherResults;
  const currentResults = type === "current" ? results : otherResults;

  console.log("\n✅ Performance comparison (vs baseline)");
  const markdownOutput = buildComparisonMarkdown(currentResults, baselineResults);
  console.log(markdownOutput);

  const compareOutputPath = join(BENCHMARK_DIR, "output.md");
  writeMarkdownOutput(compareOutputPath, markdownOutput);
  console.log(`\n🔗 Saved output report: ${compareOutputPath}`);
}

// Run benchmarks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks().catch(console.error);
}

export { runBenchmarks };

function setupBenchmarks(bench: Bench, repoPaths: Map<string, string>): void {
  // Express benchmarks
  const expressPath = repoPaths.get("express");
  if (expressPath) {
    const options: FingerprintOptions = { gitIgnore: true };
    bench.add("express-sync", () => {
      calculateFingerprintSync(expressPath, options);
    });
    bench.add("express", async () => {
      await calculateFingerprint(expressPath, options);
    });
  }

  // React Native benchmarks
  const reactNativePath = repoPaths.get("react-native");
  if (reactNativePath) {
    const options: FingerprintOptions = { files: ["packages/", "package.json"], gitIgnore: true };
    bench.add("react-native-sync", () => {
      calculateFingerprintSync(reactNativePath, options);
    });
    bench.add("react-native", async () => {
      await calculateFingerprint(reactNativePath, options);
    });

    bench.add("react-native-sync (null-hash)", () => {
      calculateFingerprintSync(reactNativePath, {
        ...options,
        hashAlgorithm: "null",
      });
    });
    bench.add("react-native (null-hash)", async () => {
      await calculateFingerprint(reactNativePath, {
        ...options,
        hashAlgorithm: "null",
      });
    });

    // App inside a monorepo, pulling in sibling packages via `../` (git scan runs from the repo root)
    const monorepoPath = join(reactNativePath, "packages", "rn-tester");
    const monorepoOptions: FingerprintOptions = {
      files: ["./", "../virtualized-lists/", "../../package.json"],
      gitIgnore: true,
    };
    bench.add("react-native-sync (monorepo)", () => {
      calculateFingerprintSync(monorepoPath, monorepoOptions);
    });
    bench.add("react-native (monorepo)", async () => {
      await calculateFingerprint(monorepoPath, monorepoOptions);
    });

    // Skips git entirely, isolating the cost of `gitIgnore`
    bench.add("react-native-sync (no .git)", () => {
      calculateFingerprintSync(reactNativePath, {
        ...options,
        gitIgnore: false,
      });
    });
    bench.add("react-native (no .git)", async () => {
      await calculateFingerprint(reactNativePath, {
        ...options,
        gitIgnore: false,
      });
    });
  }

  // Expensify benchmarks
  const expensifyPath = repoPaths.get("expensify");
  if (expensifyPath) {
    const iosOptions = getRockFingerprintOptions(expensifyPath, "ios", EXPENSIFY_ROCK_CONFIG.ios);
    const androidOptions = getRockFingerprintOptions(
      expensifyPath,
      "android",
      EXPENSIFY_ROCK_CONFIG.android,
    );

    bench.add("expensify-ios-sync", () => {
      calculateFingerprintSync(expensifyPath, iosOptions);
    });
    bench.add("expensify-ios", async () => {
      await calculateFingerprint(expensifyPath, iosOptions);
    });
    bench.add("expensify-android-sync", () => {
      calculateFingerprintSync(expensifyPath, androidOptions);
    });
    bench.add("expensify-android", async () => {
      await calculateFingerprint(expensifyPath, androidOptions);
    });
  }
}

function buildResults(bench: Bench): PerformanceResults {
  return {
    timestamp: new Date().toISOString(),
    environment: getEnvironment(),
    benchmarks: bench.tasks
      .map((task) => {
        if (task.result == null) {
          return null;
        }

        return {
          name: task.name,
          latency: {
            p50: task.result.latency.p50,
            mad: task.result.latency.mad,
            min: task.result.latency.min,
            max: task.result.latency.max,
            p99: task.result.latency.p99,
            samples: task.result.latency?.samples.length ?? 0,
          },
          throughput: {
            p50: task.result.throughput.p50,
            mad: task.result.throughput.mad,
            min: task.result.throughput.min,
            max: task.result.throughput.max,
            p99: task.result.throughput.p99,
            samples: task.result.throughput.samples.length ?? 0,
          },
          totalTime: task.result.totalTime,
        } as BenchmarkResult;
      })
      .filter((b) => b != null),
  };
}

function loadPerformanceResults(path: string): PerformanceResults {
  const content = readFileSync(path, "utf8");
  return JSON.parse(content);
}

function savePerformanceResults(path: string, results: PerformanceResults) {
  try {
    mkdirSync(BENCHMARK_DIR, { recursive: true });
  } catch {
    // Directory might already exist
  }

  writeFileSync(path, JSON.stringify(results, null, 2));
}

function buildResultsTable(bench: Bench): string[][] {
  return bench.tasks
    .filter((task) => task.result != null)
    .map((task) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { latency, throughput } = task.result!;
      return [
        task.name,
        `${latency.p50?.toFixed(2)} \u00B1 ${latency.mad?.toFixed(2)}`,
        `${throughput.p50?.toFixed(2)} \u00B1 ${throughput.mad?.toFixed(2)}`,
        `${latency.samples.length}`,
      ];
    });
}

function buildComparisonTable(
  currentResults: PerformanceResults,
  baselineResults: PerformanceResults,
) {
  return currentResults.benchmarks.map((current) => {
    const baseline = baselineResults.benchmarks.find((b) => b.name === current.name);

    const baselineLatency = baseline?.latency;
    const currentLatency = current.latency;
    if (currentLatency?.p50 == null || baselineLatency?.p50 == null) {
      return [current.name, formatLatency(baselineLatency), formatLatency(currentLatency), "-"];
    }

    const delta = currentLatency.p50 - baselineLatency.p50;
    const deltaPercent = (delta / baselineLatency.p50) * 100;
    const isNoise =
      Math.abs(delta) <= NOISE_MAD_FACTOR * Math.max(baselineLatency.mad, currentLatency.mad) ||
      Math.abs(deltaPercent) < NOISE_MIN_PERCENT;
    return [
      current.name,
      formatLatency(baselineLatency),
      formatLatency(currentLatency),
      `${isNoise ? "~ " : ""}${delta > 0 ? "+" : ""}${delta.toFixed(1)} (${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(0)}%)`,
    ];
  });
}

function formatLatency(latency: BenchmarkResult["latency"] | undefined): string {
  if (latency?.p50 == null) {
    return "-";
  }

  return `${latency.p50.toFixed(2)} \u00B1 ${latency.mad?.toFixed(2)}`;
}

function buildComparisonMarkdown(
  currentResults: PerformanceResults,
  baselineResults: PerformanceResults,
): string {
  return md.joinBlocks([
    md.heading("Performance comparison (vs baseline)", { level: 3 }),
    buildEnvironmentNote(baselineResults.environment, currentResults.environment),
    md.table(
      ["Task name", "Baseline latency (ms)", "Current latency (ms)", "Change (ms)"],
      buildComparisonTable(currentResults, baselineResults),
    ),
    `\`~\` marks changes within noise (≤ ${NOISE_MAD_FACTOR}× the larger MAD, or under ${NOISE_MIN_PERCENT}%).`,
  ]);
}

function buildEnvironmentNote(
  baseline: BenchmarkEnvironment | undefined,
  current: BenchmarkEnvironment | undefined,
): string {
  const baselineText = baseline ? formatEnvironment(baseline) : "unknown";
  const currentText = current ? formatEnvironment(current) : "unknown";
  if (baselineText === currentText) {
    return `Environment: ${currentText}`;
  }

  return `Baseline environment: ${baselineText}\\\nCurrent environment: ${currentText}`;
}

function getEnvironment(): BenchmarkEnvironment {
  return {
    os: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    cpu: os.cpus()[0]?.model.trim() ?? "unknown",
    cpuCount: os.availableParallelism(),
    node: process.version,
    uvThreadpoolSize: process.env.UV_THREADPOOL_SIZE ?? "4 (default)",
  };
}

function formatEnvironment(env: BenchmarkEnvironment): string {
  return `${env.os} ${env.arch} · ${env.cpu} × ${env.cpuCount} · Node ${env.node} · UV_THREADPOOL_SIZE=${env.uvThreadpoolSize}`;
}

function writeMarkdownOutput(path: string, markdownOutput: string) {
  writeFileSync(path, markdownOutput);
}
