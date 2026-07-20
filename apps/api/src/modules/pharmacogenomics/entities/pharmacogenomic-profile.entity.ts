import type { MetabolicPhenotype } from './drug-gene-interaction.entity.js';
import type { MedicationRecommendation } from './medication-recommendation.entity.js';

export interface GenotypeInput {
  gene: string;
  haplotype1: string;
  haplotype2?: string;
  activityScore?: number;
}

export interface DrugResponseProfile {
  patientId: string;
  riskGenes: string[];
  safeDrugs: string[];
  contraindicatedDrugs: string[];
  doseAdjustedDrugs: string[];
  pharmacogenomicRiskScore: number;
  generatedAt: Date;
}

export interface MedicationOptimizationScore {
  drug: string;
  score: number;
  tier: 'OPTIMAL' | 'ACCEPTABLE' | 'USE_WITH_CAUTION' | 'AVOID' | 'CONTRAINDICATED';
  reasoning: string;
}

export class PharmacogenomicProfile {
  readonly id: string;
  readonly patientId: string;
  readonly genotypes: GenotypeInput[];
  readonly phenotypes: Map<string, MetabolicPhenotype>;
  readonly recommendations: MedicationRecommendation[];
  readonly drugResponseProfile: DrugResponseProfile;
  readonly medicationOptimizationScores: MedicationOptimizationScore[];
  readonly analysedMedications: string[];
  readonly version: string;
  readonly generatedAt: Date;

  constructor(params: {
    id?: string;
    patientId: string;
    genotypes: GenotypeInput[];
    phenotypes?: Map<string, MetabolicPhenotype>;
    recommendations?: MedicationRecommendation[];
    drugResponseProfile?: DrugResponseProfile;
    medicationOptimizationScores?: MedicationOptimizationScore[];
    analysedMedications?: string[];
    version?: string;
  }) {
    this.id = params.id ?? `pgx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.patientId = params.patientId;
    this.genotypes = params.genotypes;
    this.phenotypes = params.phenotypes ?? new Map();
    this.recommendations = params.recommendations ?? [];
    this.drugResponseProfile = params.drugResponseProfile ?? {
      patientId: params.patientId,
      riskGenes: [],
      safeDrugs: [],
      contraindicatedDrugs: [],
      doseAdjustedDrugs: [],
      pharmacogenomicRiskScore: 0,
      generatedAt: new Date(),
    };
    this.medicationOptimizationScores = params.medicationOptimizationScores ?? [];
    this.analysedMedications = params.analysedMedications ?? [];
    this.version = params.version ?? '1.0.0';
    this.generatedAt = new Date();
  }

  getPhenotypeForGene(gene: string): MetabolicPhenotype | undefined {
    return this.phenotypes.get(gene.toUpperCase());
  }

  getRecommendationsForDrug(drug: string): MedicationRecommendation[] {
    return this.recommendations.filter((r) => r.drug === drug.toLowerCase());
  }

  hasContraindications(): boolean {
    return this.recommendations.some((r) => r.isContraindicated());
  }

  getContraindicatedDrugs(): string[] {
    return [...new Set(this.recommendations.filter((r) => r.isContraindicated()).map((r) => r.drug))];
  }

  getActionableRecommendations(): MedicationRecommendation[] {
    return this.recommendations.filter((r) => r.isActionable());
  }

  getGenesAnalysed(): string[] {
    return this.genotypes.map((g) => g.gene.toUpperCase());
  }

  hasPoorMetabolizerStatus(): boolean {
    return [...this.phenotypes.values()].some((p) => p === 'POOR_METABOLIZER');
  }

  hasUltraRapidMetabolizerStatus(): boolean {
    return [...this.phenotypes.values()].some((p) => p === 'ULTRA_RAPID_METABOLIZER');
  }
}
