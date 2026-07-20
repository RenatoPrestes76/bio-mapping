import type { GenotypeInput } from '../entities/pharmacogenomic-profile.entity.js';

export class AnalyzePGxDto {
  patientId: string = '';
  genotypes: GenotypeInput[] = [];
  medications: string[] = [];
  includeAlternatives?: boolean = true;
}
