import { Injectable, NotFoundException } from '@nestjs/common';
import type { GenotypeInput } from './entities/pharmacogenomic-profile.entity.js';
import { PharmacogenomicsProvider } from './providers/pharmacogenomics.provider.js';

@Injectable()
export class PharmacogenomicsService {
  constructor(private readonly provider: PharmacogenomicsProvider) {}

  analyze(
    patientId: string,
    genotypes: GenotypeInput[],
    medications: string[],
    includeAlternatives = true,
  ) {
    return this.provider.analyzePatient(patientId, genotypes, medications, includeAlternatives);
  }

  getProfile(profileId: string) {
    const profile = this.provider.getProfile(profileId);
    if (!profile) throw new NotFoundException(`Pharmacogenomic profile not found: ${profileId}`);
    return profile;
  }

  getRecommendations(patientId: string) {
    const recommendations = this.provider.getRecommendations(patientId);
    if (!recommendations.length && !this.provider.getProfileByPatient(patientId)) {
      throw new NotFoundException(`No pharmacogenomic profile found for patient: ${patientId}`);
    }
    return recommendations;
  }

  getProfileByPatient(patientId: string) {
    const profile = this.provider.getProfileByPatient(patientId);
    if (!profile) throw new NotFoundException(`No pharmacogenomic profile found for patient: ${patientId}`);
    return profile;
  }
}
