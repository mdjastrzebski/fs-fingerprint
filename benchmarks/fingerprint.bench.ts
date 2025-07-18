import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Bench } from "tinybench";

import { calculateFingerprint } from "../src/fingerprint.js";
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
  if (repoPaths.has("lodash")) {
    const lodashPath = repoPaths.get("lodash");
    if (lodashPath) {
      bench.add("lodash", () => {
        calculateFingerprint(lodashPath);
      });
    }
  }

  // Express benchmarks
  if (repoPaths.has("express")) {
    const expressPath = repoPaths.get("express");
    if (expressPath) {
      bench.add("express", () => {
        calculateFingerprint(expressPath);
      });
    }
  }

  // React benchmarks
  if (repoPaths.has("react")) {
    const reactPath = repoPaths.get("react");
    if (reactPath) {
      bench.add("react", () => {
        calculateFingerprint(reactPath);
      });

      bench.add("react (packages only)", () => {
        calculateFingerprint(reactPath, {
          include: ["packages/**"],
        });
      });
    }
  }

  // React Native benchmarks
  if (repoPaths.has("react-native")) {
    const reactNativePath = repoPaths.get("react-native");
    if (reactNativePath) {
      bench.add("react-native", () => {
        calculateFingerprint(reactNativePath);
      });

      bench.add("react-native (null hash)", () => {
        calculateFingerprint(reactNativePath, {
          hashAlgorithm: "null",
        });
      });

      bench.add("react-native (JS/TS only)", () => {
        calculateFingerprint(reactNativePath, {
          include: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
        });
      });
    }
  }

  console.log("⏱️  Running benchmarks...");
  await bench.run();

  console.log("\n📊 Benchmark Results:");
  console.table(
    bench.table((task) => ({
      "Task name": task.name,
      "Latency med (ms)": `${task.result?.latency.p50?.toFixed(
        2
      )} \xB1 ${task.result?.latency.mad?.toFixed(2)}`,
      "Throughput med (ops/s)": `${task.result?.throughput?.p50?.toFixed(
        2
      )} \xB1 ${task.result?.throughput?.mad?.toFixed(2)}`,
      Samples: task.result?.latency.samples.length,
    }))
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
        samples: task.result?.latency.samples.length,
      },
      throughput: {
        p50: task.result?.throughput?.p50,
        mad: task.result?.throughput?.mad,
        min: task.result?.throughput?.min,
        max: task.result?.throughput?.max,
        p99: task.result?.throughput?.p99,
        samples: task.result?.throughput.samples.length,
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
      "\n⚠️  No baseline data found. Run with --baseline flag first to create baseline."
    );
    return;
  }

  const baselineData = loadBaselineStats(baselineFilepath);
  console.log("\n📊 Performance Comparison (vs baseline):");

  const comparisonTable = jsonOutput.benchmarks.map((current) => {
    const baseline = baselineData.benchmarks.find(
      (b: { name: string; latency: { p50: number } }) => b.name === current.name
    );

    if (!baseline) {
      return {
        "Task name": current.name,
        "Baseline latency (ms)": "N/A",
        "Current latency (ms)": current.latency.p50?.toFixed(2) || "N/A",
        "Change (ms)": "N/A",
      };
    }

    const currentLatency = current.latency.p50;
    const baselineLatency = baseline.latency.p50;

    if (!currentLatency || !baselineLatency) {
      return {
        "Task name": current.name,
        "Baseline latency (ms)": baselineLatency?.toFixed(2) || "N/A",
        "Current latency (ms)": currentLatency?.toFixed(2) || "N/A",
        "Change (ms)": "N/A",
      };
    }

    const latencyChange = currentLatency - baselineLatency;
    const latencyChangePercent = (latencyChange / baselineLatency) * 100;

    return {
      "Task name": current.name,
      "Baseline latency (ms)": baselineLatency.toFixed(2),
      "Current latency (ms)": currentLatency.toFixed(2),
      "Change (ms)": `${latencyChange > 0 ? "+" : ""}${latencyChange.toFixed(2)} (${
        latencyChangePercent > 0 ? "+" : ""
      }${latencyChangePercent.toFixed(1)}%)`,
    };
  });

  console.table(comparisonTable);
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
