import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Bench } from "tinybench";
import * as md from "ts-markdown-builder";

import {
  calculateFingerprint,
  calculateFingerprintSync,
  type FingerprintOptions,
} from "../src/index.js";
import { RepoManager } from "./fixtures/repos.js";

const BENCHMARK_DIR = ".benchmark";
const type = process.argv.includes("--baseline") ? "baseline" : "current";
const otherType = type === "baseline" ? "current" : "baseline";

interface PerformanceResults {
  timestamp: string;
  benchmarks: BenchmarkResult[];
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

  console.log("\n✅ Benchmark Results:");
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
  const markdownTable = md.table(
    ["Task name", "Baseline latency (ms)", "Current latency (ms)", "Change (ms)"],
    buildComparisonTable(currentResults, baselineResults),
  );
  console.log(markdownTable);

  const compareOutputPath = join(BENCHMARK_DIR, "output.md");
  writeMarkdownOutput(compareOutputPath, markdownTable);
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
    bench.add("express-sync", () => {
      calculateFingerprintSync(expressPath);
    });
    bench.add("express", async () => {
      await calculateFingerprint(expressPath);
    });
  }

  // React Native benchmarks
  const reactNativePath = repoPaths.get("react-native");
  if (reactNativePath) {
    const options: FingerprintOptions = { files: ["packages/", "package.json"] };
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
  }

  // Expensify benchmarks
  const expensifyPath = repoPaths.get("expensify");
  if (expensifyPath) {
    const iosOptions: FingerprintOptions = { files: ["ios/", "package.json"] };
    const androidOptions: FingerprintOptions = { files: ["android/", "package.json"] };

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

    const baselineLatency = baseline?.latency.p50;
    const currentLatency = current.latency.p50;
    if (currentLatency == null || baselineLatency == null) {
      return [
        current.name,
        baselineLatency?.toFixed(1) || "N/A",
        currentLatency?.toFixed(1) || "N/A",
        "N/A",
      ];
    }

    const delta = currentLatency - baselineLatency;
    const deltaPercent = (delta / baselineLatency) * 100;
    return [
      current.name,
      baselineLatency.toFixed(1),
      currentLatency.toFixed(1),
      `${delta > 0 ? "+" : ""}${delta.toFixed(1)} (${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(0)}%)`,
    ];
  });
}

function writeMarkdownOutput(path: string, markdownTable: string) {
  const markdownOutput = md.joinBlocks([
    md.heading("Performance comparison (vs baseline)", { level: 3 }),
    markdownTable,
  ]);
  writeFileSync(path, markdownOutput);
}
