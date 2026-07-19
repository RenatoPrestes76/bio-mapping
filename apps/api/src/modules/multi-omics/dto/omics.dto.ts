import type { OmicsType } from '../entities/omics-profile.entity.js';

export class ImportProfileDto {
  patientId: string = '';
  omicsType: OmicsType = 'GENOMICS' as OmicsType;
  source: string = '';
  datasetType?: string;
  variables?: string[];
  measurements: Record<string, number> = {};
  units?: Record<string, string>;
  collectionDate?: string;
  processingMethod?: string;
  metadata?: Record<string, unknown>;
  version?: string;
}

export class IntegrateProfilesDto {
  patientId: string = '';
  profileIds: string[] = [];
  fusionMethod?: string;
}

export class NormalizeProfileDto {
  profileId: string = '';
  method?: string;
}
