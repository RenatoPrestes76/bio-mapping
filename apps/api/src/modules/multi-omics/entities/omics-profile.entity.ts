export enum OmicsType {
  GENOMICS = 'GENOMICS',
  TRANSCRIPTOMICS = 'TRANSCRIPTOMICS',
  PROTEOMICS = 'PROTEOMICS',
  METABOLOMICS = 'METABOLOMICS',
  MICROBIOME = 'MICROBIOME',
  EPIGENOMICS = 'EPIGENOMICS',
  LIPIDOMICS = 'LIPIDOMICS',
  GLYCOMICS = 'GLYCOMICS',
}

export interface OmicsProfileData {
  id?: string;
  patientId: string;
  omicsType: OmicsType;
  source: string;
  version?: string;
  qualityScore?: number;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class OmicsProfile {
  readonly id: string;
  readonly patientId: string;
  readonly omicsType: OmicsType;
  readonly source: string;
  readonly version: string;
  readonly qualityScore: number;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: OmicsProfileData) {
    this.id = data.id ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.patientId = data.patientId;
    this.omicsType = data.omicsType;
    this.source = data.source;
    this.version = data.version ?? '1.0.0';
    this.qualityScore = Math.min(100, Math.max(0, data.qualityScore ?? 0));
    this.metadata = data.metadata ?? {};
    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
  }

  isHighQuality(): boolean {
    return this.qualityScore >= 80;
  }

  isUsableQuality(): boolean {
    return this.qualityScore >= 60;
  }

  withQualityScore(score: number): OmicsProfile {
    return new OmicsProfile({
      id: this.id,
      patientId: this.patientId,
      omicsType: this.omicsType,
      source: this.source,
      version: this.version,
      qualityScore: score,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }
}
