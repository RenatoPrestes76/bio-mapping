import type { OmicsType } from './omics-profile.entity.js';

export interface IntegratedFeature {
  name: string;
  omicsLayers: OmicsType[];
  value: number;
  confidence: number;
  biologicalRelevance: 'HIGH' | 'MEDIUM' | 'LOW';
  pathway?: string;
  clinicalRelevance?: string;
  metadata?: Record<string, unknown>;
}

export interface OmicsIntegrationData {
  id?: string;
  patientId: string;
  profiles: string[];
  integratedFeatures?: IntegratedFeature[];
  confidence?: number;
  fusionMethod?: string;
  version?: string;
  createdAt?: Date;
}

export class OmicsIntegration {
  readonly id: string;
  readonly patientId: string;
  readonly profiles: string[];
  readonly integratedFeatures: IntegratedFeature[];
  readonly confidence: number;
  readonly fusionMethod: string;
  readonly version: string;
  readonly createdAt: Date;

  constructor(data: OmicsIntegrationData) {
    this.id = data.id ?? `integration-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.patientId = data.patientId;
    this.profiles = data.profiles;
    this.integratedFeatures = data.integratedFeatures ?? [];
    this.confidence = Math.min(1, Math.max(0, data.confidence ?? 0));
    this.fusionMethod = data.fusionMethod ?? 'CONCATENATION';
    this.version = data.version ?? '1.0.0';
    this.createdAt = data.createdAt ?? new Date();
  }

  getFeatureByName(name: string): IntegratedFeature | undefined {
    const q = name.toLowerCase();
    return this.integratedFeatures.find((f) => f.name.toLowerCase() === q);
  }

  getHighConfidenceFeatures(threshold = 0.7): IntegratedFeature[] {
    return this.integratedFeatures.filter((f) => f.confidence >= threshold);
  }

  getFeaturesByRelevance(relevance: IntegratedFeature['biologicalRelevance']): IntegratedFeature[] {
    return this.integratedFeatures.filter((f) => f.biologicalRelevance === relevance);
  }

  getFeaturesByOmicsType(omicsType: OmicsType): IntegratedFeature[] {
    return this.integratedFeatures.filter((f) => f.omicsLayers.includes(omicsType));
  }

  getLayerCount(): number {
    const layers = new Set(this.integratedFeatures.flatMap((f) => f.omicsLayers));
    return layers.size;
  }
}
