import { Injectable } from '@nestjs/common';
import type { GenotypeInput } from '../entities/pharmacogenomic-profile.entity.js';
import { PharmacogenomicProfile } from '../entities/pharmacogenomic-profile.entity.js';
import { PharmacogenomicsInterpretationEngine } from '../engines/pharmacogenomics-interpretation.engine.js';
import { DrugInteractionEngine } from '../engines/drug-interaction.engine.js';
import type { DrugInteractionAnalysis } from '../engines/drug-interaction.engine.js';
import { MedicationOptimizationEngine } from '../engines/medication-optimization.engine.js';
import type { MedicationOptimizationScore } from '../entities/pharmacogenomic-profile.entity.js';

@Injectable()
export class PharmacogenomicsProvider {
  private readonly profiles = new Map<string, PharmacogenomicProfile>();
  private readonly patientIndex = new Map<string, PharmacogenomicProfile>();
  private readonly interpretationEngine = new PharmacogenomicsInterpretationEngine();
  private readonly interactionEngine = new DrugInteractionEngine();
  private readonly optimizationEngine = new MedicationOptimizationEngine();

  analyzePatient(
    patientId: string,
    genotypes: GenotypeInput[],
    medications: string[],
    includeAlternatives = true,
  ): PharmacogenomicProfile {
    const result = this.interpretationEngine.analyze({ patientId, genotypes, medications, includeAlternatives });

    const optimizationScores = this.optimizationEngine.score(
      medications,
      result.phenotypes,
      result.recommendations,
    );

    const profile = new PharmacogenomicProfile({
      id: result.profile.id,
      patientId,
      genotypes,
      phenotypes: result.phenotypes,
      recommendations: result.recommendations,
      drugResponseProfile: {
        ...result.drugResponseProfile,
        patientId,
      },
      medicationOptimizationScores: optimizationScores,
      analysedMedications: medications.map((m) => m.toLowerCase()),
    });

    this.profiles.set(profile.id, profile);
    this.patientIndex.set(patientId, profile);

    return profile;
  }

  getProfile(profileId: string): PharmacogenomicProfile | undefined {
    return this.profiles.get(profileId);
  }

  getProfileByPatient(patientId: string): PharmacogenomicProfile | undefined {
    return this.patientIndex.get(patientId);
  }

  getRecommendations(patientId: string): PharmacogenomicProfile['recommendations'] {
    const profile = this.getProfileByPatient(patientId);
    return profile?.recommendations ?? [];
  }

  analyzeInteractions(
    medications: string[],
    patientId?: string,
  ): DrugInteractionAnalysis {
    const phenotypes = patientId
      ? (this.getProfileByPatient(patientId)?.phenotypes ?? new Map())
      : new Map();

    return this.interactionEngine.analyzeInteractions(medications, phenotypes);
  }

  getOptimizationScores(patientId: string): MedicationOptimizationScore[] {
    const profile = this.getProfileByPatient(patientId);
    return profile?.medicationOptimizationScores ?? [];
  }

  listProfiles(): PharmacogenomicProfile[] {
    return [...this.profiles.values()];
  }

  profileCount(): number {
    return this.listProfiles().length;
  }
}
