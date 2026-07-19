import { Injectable, NotFoundException } from '@nestjs/common';
import { OmicsProfile } from '../entities/omics-profile.entity.js';
import { OmicsDataset } from '../entities/omics-dataset.entity.js';
import { OmicsIntegration, IntegratedFeature } from '../entities/omics-integration.entity.js';
import { NormalizedDataset } from '../normalization/normalization-methods.js';
import { QualityReport } from '../quality/quality-metrics.js';
import { CorrelationResult } from '../engines/cross-omics-correlation.engine.js';
import { FusionMethod } from '../fusion/fusion-strategies.js';
import { OmicsNormalizationEngine } from '../engines/omics-normalization.engine.js';
import { QualityAssessmentEngine } from '../engines/quality-assessment.engine.js';
import { FeatureFusionEngine } from '../engines/feature-fusion.engine.js';
import { CrossOmicsCorrelationEngine } from '../engines/cross-omics-correlation.engine.js';
import { BiologicalPathwayEngine } from '../engines/biological-pathway.engine.js';
import { ImportProfileDto, IntegrateProfilesDto, NormalizeProfileDto } from '../dto/omics.dto.js';

@Injectable()
export class MultiOmicsProvider {
  private readonly profileStore = new Map<string, OmicsProfile>();
  private readonly datasetStore = new Map<string, OmicsDataset>();
  private readonly normalizedStore = new Map<string, NormalizedDataset>();
  private readonly integrationStore = new Map<string, OmicsIntegration>();
  private readonly integrationsByPatient = new Map<string, string[]>();
  private readonly qualityReports = new Map<string, QualityReport>();

  private readonly normalizationEngine = new OmicsNormalizationEngine();
  private readonly qualityEngine = new QualityAssessmentEngine();
  private readonly fusionEngine = new FeatureFusionEngine();
  private readonly correlationEngine = new CrossOmicsCorrelationEngine();
  private readonly pathwayEngine = new BiologicalPathwayEngine();

  createProfile(dto: ImportProfileDto): { profile: OmicsProfile; dataset: OmicsDataset } {
    const dataset = new OmicsDataset({
      profileId: 'temp',
      datasetType: dto.datasetType,
      variables: dto.variables,
      measurements: dto.measurements,
      units: dto.units,
      collectionDate: dto.collectionDate ? new Date(dto.collectionDate) : new Date(),
      processingMethod: dto.processingMethod,
    });

    // Initial quality assessment to set profile quality score
    const qReport = this.qualityEngine.assess(dataset, dto.omicsType);

    const profile = new OmicsProfile({
      patientId: dto.patientId,
      omicsType: dto.omicsType,
      source: dto.source,
      version: dto.version,
      qualityScore: qReport.overallScore,
      metadata: dto.metadata,
    });

    // Re-create dataset with proper profileId
    const finalDataset = new OmicsDataset({
      id: dataset.id,
      profileId: profile.id,
      datasetType: dto.datasetType,
      variables: dto.variables,
      measurements: dto.measurements,
      units: dto.units,
      collectionDate: dataset.collectionDate,
      processingMethod: dto.processingMethod,
    });

    const finalReport: QualityReport = {
      ...qReport,
      profileId: profile.id,
      datasetId: finalDataset.id,
    };

    this.profileStore.set(profile.id, profile);
    this.datasetStore.set(finalDataset.id, finalDataset);
    this.qualityReports.set(profile.id, finalReport);

    return { profile, dataset: finalDataset };
  }

  normalize(dto: NormalizeProfileDto): NormalizedDataset {
    const profile = this.profileStore.get(dto.profileId);
    if (!profile) throw new NotFoundException(`Profile '${dto.profileId}' not found`);

    const dataset = this.getDatasetByProfile(dto.profileId);
    if (!dataset) throw new NotFoundException(`Dataset for profile '${dto.profileId}' not found`);

    const normalized = this.normalizationEngine.normalize(
      dataset,
      profile.omicsType,
      dto.method as any,
    );

    this.normalizedStore.set(dto.profileId, normalized);
    return normalized;
  }

  integrate(dto: IntegrateProfilesDto): OmicsIntegration {
    const profiles: OmicsProfile[] = [];
    const normalizedDatasets: NormalizedDataset[] = [];
    const fusionMethod = (dto.fusionMethod as FusionMethod) ?? 'CONCATENATION';

    for (const profileId of dto.profileIds) {
      const profile = this.profileStore.get(profileId);
      if (!profile) throw new NotFoundException(`Profile '${profileId}' not found`);
      profiles.push(profile);

      let normalized = this.normalizedStore.get(profileId);
      if (!normalized) {
        // Auto-normalize if not done yet
        const dataset = this.getDatasetByProfile(profileId);
        if (dataset) {
          normalized = this.normalizationEngine.normalize(dataset, profile.omicsType);
          this.normalizedStore.set(profileId, normalized);
        }
      }
      if (normalized) normalizedDatasets.push(normalized);
    }

    const fusionResult = this.fusionEngine.fuse(profiles, normalizedDatasets, fusionMethod);
    const annotatedFeatures = this.pathwayEngine.annotateFeatures(fusionResult.features);

    const integration = new OmicsIntegration({
      patientId: dto.patientId,
      profiles: dto.profileIds,
      integratedFeatures: annotatedFeatures,
      confidence: fusionResult.confidence,
      fusionMethod,
    });

    this.integrationStore.set(integration.id, integration);
    const list = this.integrationsByPatient.get(dto.patientId) ?? [];
    list.push(integration.id);
    this.integrationsByPatient.set(dto.patientId, list);

    return integration;
  }

  calculateQuality(profileId: string): QualityReport {
    const profile = this.profileStore.get(profileId);
    if (!profile) throw new NotFoundException(`Profile '${profileId}' not found`);

    const dataset = this.getDatasetByProfile(profileId);
    if (!dataset) throw new NotFoundException(`Dataset for profile '${profileId}' not found`);

    const report = this.qualityEngine.assess(dataset, profile.omicsType);
    const fullReport = { ...report, profileId: profile.id, datasetId: dataset.id };
    this.qualityReports.set(profileId, fullReport);

    // Update profile quality score
    const updatedProfile = profile.withQualityScore(report.overallScore);
    this.profileStore.set(profileId, updatedProfile);

    return fullReport;
  }

  correlate(integrationId: string): CorrelationResult[] {
    const integration = this.integrationStore.get(integrationId);
    if (!integration) throw new NotFoundException(`Integration '${integrationId}' not found`);

    const normalizedDatasets: NormalizedDataset[] = integration.profiles
      .map((pid) => this.normalizedStore.get(pid))
      .filter((ds): ds is NormalizedDataset => ds !== undefined);

    if (normalizedDatasets.length < 2) return [];
    return this.correlationEngine.correlateAll(normalizedDatasets);
  }

  generateFeatures(patientId: string): IntegratedFeature[] {
    const integrationIds = this.integrationsByPatient.get(patientId) ?? [];
    if (integrationIds.length === 0) return [];

    const latestId = integrationIds[integrationIds.length - 1];
    const integration = this.integrationStore.get(latestId);
    return integration?.integratedFeatures ?? [];
  }

  getProfile(id: string): OmicsProfile | undefined {
    return this.profileStore.get(id);
  }

  getIntegration(id: string): OmicsIntegration | undefined {
    return this.integrationStore.get(id);
  }

  getNormalizedDataset(profileId: string): NormalizedDataset | undefined {
    return this.normalizedStore.get(profileId);
  }

  getQualityReport(profileId: string): QualityReport | undefined {
    return this.qualityReports.get(profileId);
  }

  profileCount(): number {
    return this.profileStore.size;
  }

  integrationCount(): number {
    return this.integrationStore.size;
  }

  private getDatasetByProfile(profileId: string): OmicsDataset | undefined {
    for (const [, dataset] of this.datasetStore.entries()) {
      if (dataset.profileId === profileId) return dataset;
    }
    return undefined;
  }
}
