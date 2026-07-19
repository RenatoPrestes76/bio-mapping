import { NormalizedDataset } from '../normalization/normalization-methods.js';

export interface CorrelationPair {
  variable1: string;
  omicsType1: string;
  variable2: string;
  omicsType2: string;
  correlation: number;
  significance: 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';
}

export interface CorrelationResult {
  omicsLayerPair: [string, string];
  correlations: CorrelationPair[];
  sharedVariableCount: number;
  networkDensity: number;
  topCorrelatedPairs: CorrelationPair[];
  summary: string;
  generatedAt: Date;
}

export interface CorrelationNetwork {
  nodes: Array<{ id: string; omicsType: string; weight: number }>;
  edges: Array<{ source: string; target: string; correlation: number; significance: string }>;
  clusterCount: number;
  density: number;
}

export class CrossOmicsCorrelationEngine {
  correlate(ds1: NormalizedDataset, ds2: NormalizedDataset): CorrelationResult {
    const pairs: CorrelationPair[] = [];

    // Find shared variable names
    const vars1 = Object.keys(ds1.normalizedValues);
    const vars2 = Object.keys(ds2.normalizedValues);
    const shared = vars1.filter((v) =>
      vars2.some((v2) => v2.toLowerCase() === v.toLowerCase()),
    );

    for (const varName of shared) {
      const v1 = ds1.normalizedValues[varName];
      const v2 = vars2.find((v) => v.toLowerCase() === varName.toLowerCase())!;
      const val1 = v1;
      const val2 = ds2.normalizedValues[v2];
      // Single-point "correlation" — treat as direction similarity
      const r = this.singlePointCorrelation(val1, val2);
      pairs.push({
        variable1: varName,
        omicsType1: ds1.omicsType,
        variable2: v2,
        omicsType2: ds2.omicsType,
        correlation: r,
        significance: this.toSignificance(Math.abs(r)),
      });
    }

    // Cross-type correlation: compare value distributions
    if (shared.length < 3) {
      const distribCorr = this.distributionCorrelation(ds1, ds2);
      pairs.push(...distribCorr);
    }

    const significantPairs = pairs.filter((p) => p.significance !== 'NONE');
    const networkDensity =
      pairs.length > 0 ? Math.round((significantPairs.length / pairs.length) * 100) / 100 : 0;
    const top = [...significantPairs].sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)).slice(0, 10);

    return {
      omicsLayerPair: [ds1.omicsType, ds2.omicsType],
      correlations: pairs,
      sharedVariableCount: shared.length,
      networkDensity,
      topCorrelatedPairs: top,
      summary: this.buildSummary(pairs, shared.length, ds1.omicsType, ds2.omicsType),
      generatedAt: new Date(),
    };
  }

  correlateAll(datasets: NormalizedDataset[]): CorrelationResult[] {
    const results: CorrelationResult[] = [];
    for (let i = 0; i < datasets.length; i++) {
      for (let j = i + 1; j < datasets.length; j++) {
        results.push(this.correlate(datasets[i], datasets[j]));
      }
    }
    return results;
  }

  buildNetwork(datasets: NormalizedDataset[]): CorrelationNetwork {
    const nodes: CorrelationNetwork['nodes'] = [];
    const edges: CorrelationNetwork['edges'] = [];

    for (const ds of datasets) {
      const vars = Object.keys(ds.normalizedValues);
      const avgVal = vars.length > 0
        ? vars.reduce((sum, k) => sum + Math.abs(ds.normalizedValues[k]), 0) / vars.length
        : 0;
      nodes.push({ id: `${ds.omicsType}:${ds.datasetId}`, omicsType: ds.omicsType, weight: avgVal });
    }

    const results = this.correlateAll(datasets);
    for (const result of results) {
      for (const pair of result.topCorrelatedPairs) {
        edges.push({
          source: `${pair.omicsType1}:${pair.variable1}`,
          target: `${pair.omicsType2}:${pair.variable2}`,
          correlation: pair.correlation,
          significance: pair.significance,
        });
      }
    }

    const significantEdges = edges.filter((e) => e.significance !== 'NONE').length;
    const maxEdges = nodes.length * (nodes.length - 1) / 2;
    const density = maxEdges > 0 ? Math.round((significantEdges / maxEdges) * 100) / 100 : 0;

    return { nodes, edges, clusterCount: Math.max(1, Math.ceil(nodes.length / 3)), density };
  }

  findSharedVariables(datasets: NormalizedDataset[]): string[] {
    if (datasets.length === 0) return [];
    const sets = datasets.map((ds) => new Set(Object.keys(ds.normalizedValues).map((k) => k.toLowerCase())));
    const first = sets[0];
    const shared: string[] = [];
    for (const v of first) {
      if (sets.every((s) => s.has(v))) shared.push(v);
    }
    return shared;
  }

  pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] ** 2;
      sumY2 += y[i] ** 2;
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
    if (denominator === 0) return 0;

    return Math.round((numerator / denominator) * 1e6) / 1e6;
  }

  private singlePointCorrelation(v1: number, v2: number): number {
    // For single-point comparison, use sign agreement as correlation proxy
    if (v1 === 0 && v2 === 0) return 1;
    if (v1 === 0 || v2 === 0) return 0;
    const sign = Math.sign(v1) === Math.sign(v2) ? 1 : -1;
    const magnitude = 1 - Math.abs(v1 - v2) / (Math.abs(v1) + Math.abs(v2));
    return Math.round(sign * magnitude * 1e6) / 1e6;
  }

  private distributionCorrelation(ds1: NormalizedDataset, ds2: NormalizedDataset): CorrelationPair[] {
    const vals1 = Object.values(ds1.normalizedValues);
    const vals2 = Object.values(ds2.normalizedValues);
    if (vals1.length === 0 || vals2.length === 0) return [];

    // Compare distribution statistics
    const mean1 = vals1.reduce((a, b) => a + b, 0) / vals1.length;
    const mean2 = vals2.reduce((a, b) => a + b, 0) / vals2.length;

    // Global correlation as distribution similarity
    const diffRatio = Math.abs(mean1 - mean2) / (Math.abs(mean1) + Math.abs(mean2) + 1e-10);
    const globalCorr = 1 - diffRatio;

    if (Math.abs(globalCorr) < 0.3) return [];

    return [
      {
        variable1: `${ds1.omicsType}:distribution_mean`,
        omicsType1: ds1.omicsType,
        variable2: `${ds2.omicsType}:distribution_mean`,
        omicsType2: ds2.omicsType,
        correlation: Math.round(globalCorr * 1e6) / 1e6,
        significance: this.toSignificance(Math.abs(globalCorr)),
      },
    ];
  }

  private toSignificance(absCorr: number): CorrelationPair['significance'] {
    if (absCorr >= 0.7) return 'HIGH';
    if (absCorr >= 0.4) return 'MODERATE';
    if (absCorr >= 0.2) return 'LOW';
    return 'NONE';
  }

  private buildSummary(
    pairs: CorrelationPair[],
    sharedCount: number,
    type1: string,
    type2: string,
  ): string {
    const sig = pairs.filter((p) => p.significance !== 'NONE').length;
    return `Cross-omics correlation (${type1} × ${type2}): ${sharedCount} shared variables, ${sig}/${pairs.length} significant pairs`;
  }
}
