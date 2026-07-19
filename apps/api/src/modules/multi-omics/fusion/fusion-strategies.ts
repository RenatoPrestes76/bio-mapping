import type { OmicsType } from '../entities/omics-profile.entity.js';
import type { IntegratedFeature } from '../entities/omics-integration.entity.js';
import type { NormalizedDataset } from '../normalization/normalization-methods.js';

export type FusionMethod = 'CONCATENATION' | 'WEIGHTED_AVERAGE' | 'CONSENSUS' | 'EARLY' | 'LATE';

export interface FusionInput {
  normalizedDataset: NormalizedDataset;
  qualityScore: number;
  omicsType: OmicsType;
  profileId: string;
}

export function concatenationFusion(inputs: FusionInput[]): IntegratedFeature[] {
  const features: IntegratedFeature[] = [];
  for (const input of inputs) {
    const confidence = Math.min(1, input.qualityScore / 100);
    for (const [variable, value] of Object.entries(input.normalizedDataset.normalizedValues)) {
      features.push({
        name: `${input.omicsType.toLowerCase()}:${variable}`,
        omicsLayers: [input.omicsType],
        value: Math.round(value * 1e6) / 1e6,
        confidence: Math.round(confidence * 100) / 100,
        biologicalRelevance: assessRelevance(value, confidence),
      });
    }
  }
  return features;
}

export function weightedAverageFusion(inputs: FusionInput[]): IntegratedFeature[] {
  const variableMap = new Map<string, { sum: number; weightSum: number; layers: Set<OmicsType>; maxConf: number }>();

  for (const input of inputs) {
    const weight = Math.max(0.01, input.qualityScore / 100);
    for (const [variable, value] of Object.entries(input.normalizedDataset.normalizedValues)) {
      const key = variable.toLowerCase();
      const existing = variableMap.get(key);
      if (existing) {
        existing.sum += value * weight;
        existing.weightSum += weight;
        existing.layers.add(input.omicsType);
        existing.maxConf = Math.max(existing.maxConf, weight);
      } else {
        variableMap.set(key, {
          sum: value * weight,
          weightSum: weight,
          layers: new Set([input.omicsType]),
          maxConf: weight,
        });
      }
    }
  }

  const features: IntegratedFeature[] = [];
  for (const [name, data] of variableMap.entries()) {
    const value = data.sum / data.weightSum;
    const confidence = Math.round(data.maxConf * 100) / 100;
    features.push({
      name,
      omicsLayers: [...data.layers],
      value: Math.round(value * 1e6) / 1e6,
      confidence,
      biologicalRelevance: assessRelevance(value, confidence),
    });
  }
  return features;
}

export function consensusFusion(inputs: FusionInput[], threshold = 0.5): IntegratedFeature[] {
  const variableCount = new Map<string, { count: number; valueSum: number; layers: Set<OmicsType>; confSum: number }>();

  for (const input of inputs) {
    const confidence = Math.max(0.01, input.qualityScore / 100);
    for (const [variable, value] of Object.entries(input.normalizedDataset.normalizedValues)) {
      const key = variable.toLowerCase();
      const existing = variableCount.get(key);
      if (existing) {
        existing.count++;
        existing.valueSum += value;
        existing.layers.add(input.omicsType);
        existing.confSum += confidence;
      } else {
        variableCount.set(key, {
          count: 1,
          valueSum: value,
          layers: new Set([input.omicsType]),
          confSum: confidence,
        });
      }
    }
  }

  const totalInputs = inputs.length;
  const features: IntegratedFeature[] = [];
  for (const [name, data] of variableCount.entries()) {
    const presenceFraction = data.count / totalInputs;
    if (presenceFraction < threshold) continue;
    const value = data.valueSum / data.count;
    const confidence = Math.round((data.confSum / data.count) * 100) / 100;
    features.push({
      name,
      omicsLayers: [...data.layers],
      value: Math.round(value * 1e6) / 1e6,
      confidence,
      biologicalRelevance: assessRelevance(value, confidence),
    });
  }
  return features;
}

function assessRelevance(value: number, confidence: number): IntegratedFeature['biologicalRelevance'] {
  if (Math.abs(value) >= 1.5 && confidence >= 0.7) return 'HIGH';
  if (Math.abs(value) >= 0.5 && confidence >= 0.5) return 'MEDIUM';
  return 'LOW';
}

export function computeFusionConfidence(inputs: FusionInput[]): number {
  if (inputs.length === 0) return 0;
  const avgQuality = inputs.reduce((sum, i) => sum + i.qualityScore, 0) / inputs.length;
  const layerBonus = Math.min(0.15, (inputs.length - 1) * 0.05); // multi-layer integration bonus
  return Math.min(1, Math.round((avgQuality / 100 + layerBonus) * 100) / 100);
}
