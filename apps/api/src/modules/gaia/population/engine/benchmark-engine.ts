export interface BenchmarkEntry {
  key: string;
  label: string;
  valueA: number;
  valueB: number | null;
  unit?: string;
  difference: number | null;
  percentDiff: number | null;
}

export interface BenchmarkReport {
  entries: BenchmarkEntry[];
  cohortASize: number;
  cohortBSize: number;
  computedAt: Date;
  topDifference: BenchmarkEntry | null;
}

export function computeBenchmarkEntry(
  key: string,
  label: string,
  valueA: number,
  valueB: number | null,
  unit?: string,
): BenchmarkEntry {
  const difference = valueB !== null ? parseFloat((valueA - valueB).toFixed(3)) : null;
  const percentDiff =
    valueB !== null && valueB !== 0
      ? parseFloat(((valueA - valueB) / Math.abs(valueB) * 100).toFixed(2))
      : null;
  return { key, label, valueA, valueB, unit, difference, percentDiff };
}

export function compareCohortMetrics(
  metricsA: Record<string, number>,
  metricsB: Record<string, number>,
  labels: Record<string, string> = {},
  units: Record<string, string> = {},
): BenchmarkEntry[] {
  const keys = new Set([...Object.keys(metricsA), ...Object.keys(metricsB)]);
  return [...keys].map((key) =>
    computeBenchmarkEntry(key, labels[key] ?? key, metricsA[key] ?? 0, metricsB[key] ?? null, units[key]),
  );
}

export function rankByAbsoluteDiff(entries: BenchmarkEntry[]): BenchmarkEntry[] {
  return [...entries].sort((a, b) => Math.abs(b.percentDiff ?? 0) - Math.abs(a.percentDiff ?? 0));
}

export function buildBenchmarkReport(
  metricsA: Record<string, number>,
  metricsB: Record<string, number>,
  cohortASize: number,
  cohortBSize: number,
  labels: Record<string, string> = {},
  units: Record<string, string> = {},
): BenchmarkReport {
  const entries = rankByAbsoluteDiff(compareCohortMetrics(metricsA, metricsB, labels, units));
  const topDifference = entries.find((e) => e.percentDiff !== null) ?? null;
  return { entries, cohortASize, cohortBSize, computedAt: new Date(), topDifference };
}
