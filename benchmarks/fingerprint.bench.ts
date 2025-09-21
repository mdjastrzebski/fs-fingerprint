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

const isBaseline = process.argv.includes("--baseline");

interface PerformanceStats {
  benchmarks: BenchmarkResult[];
}
interface BenchmarkResult {
  name: string;
  latency: { p50: number; mad: number; min: number; max: number; p99: number; samples: number };
  throughput: { p50: number; mad: number; min: number; max: number; p99: number; samples: number };
  totalTime: number;
}

async function runBenchmarks(): Promise<void> {
  const repoManager = new RepoManager();
  const repoPaths = await repoManager.setupAllRepos();

  const bench = new Bench({
    name: "fs-fingerprint performance benchmarks",
    time: 1000, // Run for 1 second
    iterations: 10,
  });

  // Lodash benchmarks
  const lodashPath = repoPaths.get("lodash");
  if (lodashPath) {
    bench.add("lodash-sync", () => {
      calculateFingerprintSync(lodashPath);
    });
    bench.add("lodash", async () => {
      await calculateFingerprint(lodashPath);
    });
  }

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

  // React benchmarks
  const reactPath = repoPaths.get("react");
  if (reactPath) {
    bench.add("react-sync", () => {
      calculateFingerprintSync(reactPath);
    });
    bench.add("react", async () => {
      await calculateFingerprint(reactPath);
    });
  }

  // React Native benchmarks
  const reactNativeOptions: FingerprintOptions = {
    include: ["packages", "package.json", "README.md"],
    exclude: ["**/node_modules/**", "**/.git/**"],
  };

  const reactNativePath = repoPaths.get("react-native");
  if (reactNativePath) {
    bench.add("react-native-sync", () => {
      calculateFingerprintSync(reactNativePath, reactNativeOptions);
    });
    bench.add("react-native", async () => {
      await calculateFingerprint(reactNativePath, reactNativeOptions);
    });

    bench.add("react-native (null hash)-sync", () => {
      calculateFingerprintSync(reactNativePath, {
        ...reactNativeOptions,
        hashAlgorithm: "null",
      });
    });
    bench.add("react-native (null hash)", async () => {
      await calculateFingerprint(reactNativePath, {
        ...reactNativeOptions,
        hashAlgorithm: "null",
      });
    });
  }

  // Expensify benchmarks
  const expensifyPath = repoPaths.get("expensify");
  const iosOptions: FingerprintOptions = {
    include: ["ios", "package.json"],
  };

  const androidOptions: FingerprintOptions = {
    include: ["android", "package.json"],
  };

  if (expensifyPath) {
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

  console.log("⏱️  Running benchmarks...");
  await bench.run();

  console.log("\n📊 Benchmark Results:");
  const table = bench.table(
    (task) =>
      [
        task.name,
        `${task.result?.latency.p50?.toFixed(2)} \xB1 ${task.result?.latency.mad?.toFixed(2)}`,
        `${task.result?.throughput?.p50?.toFixed(2)} \xB1 ${task.result?.throughput?.mad?.toFixed(2)}`,
        `${task.result?.latency?.samples.length ?? 0}`,
      ] as Record<number, string>,
  ) as unknown as string[][];
  console.log(
    md.table(["Task name", "Latency med (ms)", "Throughput med (ops/s)", "Samples"], table),
  );

  // Write machine-readable JSON output
  const jsonOutput = {
    timestamp: new Date().toISOString(),
    benchmarks: bench.tasks.map((task) => ({
      name: task.name,
      latency: {
        p50: task.result?.latency.p50,
        mad: task.result?.latency.mad,
        min: task.result?.latency.min,
        max: task.result?.latency.max,
        p99: task.result?.latency.p99,
        samples: task.result?.latency?.samples.length ?? 0,
      },
      throughput: {
        p50: task.result?.throughput?.p50,
        mad: task.result?.throughput?.mad,
        min: task.result?.throughput?.min,
        max: task.result?.throughput?.max,
        p99: task.result?.throughput?.p99,
        samples: task.result?.throughput?.samples.length ?? 0,
      },
      totalTime: task.result?.totalTime,
    })),
  };

  // Ensure .benchmark directory exists
  const benchmarkDir = ".benchmark";
  try {
    mkdirSync(benchmarkDir, { recursive: true });
  } catch {
    // Directory might already exist
  }

  // Write to appropriate file based on --baseline flag
  const filename = isBaseline ? "baseline.json" : "current.json";
  const filepath = join(benchmarkDir, filename);

  writeFileSync(filepath, JSON.stringify(jsonOutput, null, 2));
  console.log(`\n📝 Results written to ${filepath}`);

  if (isBaseline) {
    console.log(`\n📝 Baseline written to ${filepath}`);
    return;
  }

  // If not baseline mode, compare with baseline if it exists
  const baselineFilepath = join(benchmarkDir, "baseline.json");
  if (!existsSync(baselineFilepath)) {
    console.error(
      "\n⚠️  No baseline data found. Run with --baseline flag first to create baseline.",
    );
    return;
  }

  const baselineData = loadBaselineStats(baselineFilepath);
  console.log("\n📊 Performance Comparison (vs baseline):");

  const comparisonTable = jsonOutput.benchmarks.map((current) => {
    const baseline = baselineData.benchmarks.find(
      (b: { name: string; latency: { p50: number } }) => b.name === current.name,
    );

    if (!baseline) {
      return [current.name, "N/A", current.latency.p50?.toFixed(2) || "N/A", "N/A"];
    }

    const currentLatency = current.latency.p50;
    const baselineLatency = baseline.latency.p50;

    if (!currentLatency || !baselineLatency) {
      return [
        current.name,
        baselineLatency?.toFixed(2) || "N/A",
        currentLatency?.toFixed(2) || "N/A",
        "N/A",
      ];
    }

    const latencyChange = currentLatency - baselineLatency;
    const latencyChangePercent = (latencyChange / baselineLatency) * 100;

    return [
      current.name,
      baselineLatency.toFixed(2),
      currentLatency.toFixed(2),
      `${latencyChange > 0 ? "+" : ""}${latencyChange.toFixed(2)} (${latencyChangePercent > 0 ? "+" : ""}${latencyChangePercent.toFixed(1)}%)`,
    ];
  });

  console.log(
    md.table(
      ["Task name", "Baseline latency (ms)", "Current latency (ms)", "Change (ms)"],
      comparisonTable,
    ),
  );
}

// Run benchmarks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks().catch(console.error);
}

export { runBenchmarks };

function loadBaselineStats(baselineFilepath: string): PerformanceStats {
  const baselineContent = readFileSync(baselineFilepath, "utf8");
  return JSON.parse(baselineContent);
}
