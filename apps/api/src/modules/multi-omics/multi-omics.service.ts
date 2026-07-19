import { Injectable, NotFoundException } from '@nestjs/common';
import { OmicsProfile } from './entities/omics-profile.entity.js';
import { OmicsIntegration, IntegratedFeature } from './entities/omics-integration.entity.js';
import { MultiOmicsProvider } from './providers/multi-omics.provider.js';
import { NormalizedDataset } from './normalization/normalization-methods.js';
import { QualityReport } from './quality/quality-metrics.js';
import { CorrelationResult } from './engines/cross-omics-correlation.engine.js';
import { BiologicalPathwayEngine, PathwayMapping, PathwayEnrichment } from './engines/biological-pathway.engine.js';
import { ImportProfileDto, IntegrateProfilesDto, NormalizeProfileDto } from './dto/omics.dto.js';

export interface ImportProfileResult {
  profile: OmicsProfile;
  qualityReport: QualityReport | undefined;
}

export interface IntegrationSummary {
  integration: OmicsIntegration;
  topFeatures: IntegratedFeature[];
  pathwayMappings: PathwayMapping[];
  clinicalImpact: string;
}

@Injectable()
export class MultiOmicsService {
  private readonly pathwayEngine = new BiologicalPathwayEngine();

  constructor(private readonly provider: MultiOmicsProvider) {}

  importProfile(dto: ImportProfileDto): ImportProfileResult {
    const { profile } = this.provider.createProfile(dto);
    const qualityReport = this.provider.getQualityReport(profile.id);
    return { profile, qualityReport };
  }

  normalizeProfile(dto: NormalizeProfileDto): NormalizedDataset {
    return this.provider.normalize(dto);
  }

  integrateProfiles(dto: IntegrateProfilesDto): IntegrationSummary {
    if (dto.profileIds.length === 0) {
      throw new NotFoundException('No profile IDs provided for integration');
    }

    const integration = this.provider.integrate(dto);
    const topFeatures = integration.integratedFeatures
      .slice()
      .sort((a, b) => {
        const order = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return order[b.biologicalRelevance] - order[a.biologicalRelevance];
      })
      .slice(0, 20);

    const pathwayMappings = this.pathwayEngine.mapToPathways(integration.integratedFeatures);
    const clinicalImpact = this.pathwayEngine.getClinicalImpact(pathwayMappings);

    return { integration, topFeatures, pathwayMappings, clinicalImpact };
  }

  analyzeCorrelations(integrationId: string): CorrelationResult[] {
    const integration = this.provider.getIntegration(integrationId);
    if (!integration) throw new NotFoundException(`Integration '${integrationId}' not found`);
    return this.provider.correlate(integrationId);
  }

  calculateQuality(profileId: string): QualityReport {
    return this.provider.calculateQuality(profileId);
  }

  getIntegratedFeatures(patientId: string): {
    features: IntegratedFeature[];
    enrichment: PathwayEnrichment[];
    summary: string;
  } {
    const features = this.provider.generateFeatures(patientId);
    const enrichment = this.pathwayEngine.enrichmentAnalysis(features);
    const summary =
      features.length === 0
        ? 'No integrated features available for this patient'
        : `${features.length} integrated features across ${new Set(features.flatMap((f) => f.omicsLayers)).size} omics layer(s)`;

    return { features, enrichment, summary };
  }

  getProfile(id: string): OmicsProfile {
    const profile = this.provider.getProfile(id);
    if (!profile) throw new NotFoundException(`Omics Profile '${id}' not found`);
    return profile;
  }

  getIntegration(id: string): OmicsIntegration {
    const integration = this.provider.getIntegration(id);
    if (!integration) throw new NotFoundException(`Omics Integration '${id}' not found`);
    return integration;
  }

  getNormalizedDataset(profileId: string): NormalizedDataset {
    this.getProfile(profileId); // validates existence
    const normalized = this.provider.getNormalizedDataset(profileId);
    if (!normalized) throw new NotFoundException(`Normalized dataset for profile '${profileId}' not found — normalize first`);
    return normalized;
  }
}
