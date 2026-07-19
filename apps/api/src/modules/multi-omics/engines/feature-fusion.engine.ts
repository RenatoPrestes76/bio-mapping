import { OmicsProfile } from '../entities/omics-profile.entity.js';
import { IntegratedFeature } from '../entities/omics-integration.entity.js';
import { NormalizedDataset } from '../normalization/normalization-methods.js';
import {
  FusionMethod,
  FusionInput,
  concatenationFusion,
  weightedAverageFusion,
  consensusFusion,
  computeFusionConfidence,
} from '../fusion/fusion-strategies.js';

export interface FusionResult {
  features: IntegratedFeature[];
  confidence: number;
  method: FusionMethod;
  layerCount: number;
  featureCount: number;
  summary: string;
}

export class FeatureFusionEngine {
  fuse(
    profiles: OmicsProfile[],
    normalizedDatasets: NormalizedDataset[],
    method: FusionMethod = 'CONCATENATION',
  ): FusionResult {
    if (profiles.length === 0 || normalizedDatasets.length === 0) {
      return {
        features: [],
        confidence: 0,
        method,
        layerCount: 0,
        featureCount: 0,
        summary: 'No profiles provided for fusion',
      };
    }

    const inputs: FusionInput[] = normalizedDatasets.map((ds) => {
      const profile = profiles.find((p) => p.id === ds.profileId);
      return {
        normalizedDataset: ds,
        qualityScore: profile?.qualityScore ?? 50,
        omicsType: (profile?.omicsType ?? ds.omicsType) as any,
        profileId: ds.profileId,
      };
    });

    let features: IntegratedFeature[];
    switch (method) {
      case 'WEIGHTED_AVERAGE':
        features = weightedAverageFusion(inputs);
        break;
      case 'CONSENSUS':
        features = consensusFusion(inputs);
        break;
      case 'EARLY':
        features = concatenationFusion(inputs); // early = concatenate raw normalized
        break;
      case 'LATE':
        // Late fusion: average after individual analyses — simplified as weighted average
        features = weightedAverageFusion(inputs);
        break;
      default:
        features = concatenationFusion(inputs);
    }

    const confidence = computeFusionConfidence(inputs);
    const layerCount = new Set(profiles.map((p) => p.omicsType)).size;

    return {
      features,
      confidence,
      method,
      layerCount,
      featureCount: features.length,
      summary: this.buildSummary(features, layerCount, method),
    };
  }

  rankFeatures(features: IntegratedFeature[]): IntegratedFeature[] {
    return [...features].sort((a, b) => {
      const relevanceOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const relDiff = relevanceOrder[b.biologicalRelevance] - relevanceOrder[a.biologicalRelevance];
      if (relDiff !== 0) return relDiff;
      const confDiff = b.confidence - a.confidence;
      if (Math.abs(confDiff) > 0.01) return confDiff;
      return Math.abs(b.value) - Math.abs(a.value);
    });
  }

  getTopFeatures(features: IntegratedFeature[], n = 20): IntegratedFeature[] {
    return this.rankFeatures(features).slice(0, n);
  }

  getMultiLayerFeatures(features: IntegratedFeature[]): IntegratedFeature[] {
    return features.filter((f) => f.omicsLayers.length > 1);
  }

  private buildSummary(
    features: IntegratedFeature[],
    layerCount: number,
    method: FusionMethod,
  ): string {
    const highCount = features.filter((f) => f.biologicalRelevance === 'HIGH').length;
    return `Fusion (${method}) across ${layerCount} omics layer(s) produced ${features.length} features (${highCount} high biological relevance)`;
  }
}
