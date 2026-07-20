import type { MetabolicPhenotype } from '../entities/drug-gene-interaction.entity.js';
import type { GenotypeInput, DrugResponseProfile, MedicationOptimizationScore } from '../entities/pharmacogenomic-profile.entity.js';
import { PharmacogenomicProfile } from '../entities/pharmacogenomic-profile.entity.js';
import type { MedicationRecommendation } from '../entities/medication-recommendation.entity.js';
import { PhenotypeInterpreter } from '../interpreters/phenotype.interpreter.js';
import { RecommendationInterpreter } from '../interpreters/recommendation.interpreter.js';

const phenotypeInterpreter = new PhenotypeInterpreter();
const recommendationInterpreter = new RecommendationInterpreter();

export interface PGxAnalysisInput {
  patientId: string;
  genotypes: GenotypeInput[];
  medications: string[];
  includeAlternatives?: boolean;
}

export interface PGxAnalysisResult {
  profile: PharmacogenomicProfile;
  phenotypes: Map<string, MetabolicPhenotype>;
  recommendations: MedicationRecommendation[];
  drugResponseProfile: DrugResponseProfile;
  optimizationScores: MedicationOptimizationScore[];
}

function computeRiskScore(recommendations: MedicationRecommendation[]): number {
  if (recommendations.length === 0) return 0;
  let total = 0;
  for (const rec of recommendations) {
    switch (rec.severity) {
      case 'CONTRAINDICATED': total += 100; break;
      case 'AVOID': total += 80; break;
      case 'DOSE_REDUCTION': total += 40; break;
      case 'DOSE_INCREASE': total += 30; break;
      case 'USE_WITH_CAUTION': total += 20; break;
      case 'MONITOR': total += 10; break;
      default: break;
    }
  }
  return Math.min(100, Math.round(total / recommendations.length));
}

export class PharmacogenomicsInterpretationEngine {
  analyze(input: PGxAnalysisInput): PGxAnalysisResult {
    const phenotypeResults = phenotypeInterpreter.interpretAll(input.genotypes);
    const phenotypes = phenotypeInterpreter.toPhenotypeMap(phenotypeResults);

    const recommendations = recommendationInterpreter.interpretAll(
      input.medications,
      phenotypes,
      input.genotypes,
      input.includeAlternatives ?? true,
    );

    const riskGenes = phenotypeResults
      .filter((r) => r.phenotype === 'POOR_METABOLIZER' || r.phenotype === 'ULTRA_RAPID_METABOLIZER')
      .map((r) => r.gene);

    const contraindicatedDrugs = [
      ...new Set(recommendations.filter((r) => r.isContraindicated()).map((r) => r.drug)),
    ];
    const avoidDrugs = [...new Set(recommendations.filter((r) => r.severity === 'AVOID').map((r) => r.drug))];
    const doseAdjustedDrugs = [
      ...new Set(
        recommendations
          .filter((r) => r.severity === 'DOSE_REDUCTION' || r.severity === 'DOSE_INCREASE')
          .map((r) => r.drug),
      ),
    ];
    const safeDrugs = [
      ...new Set(recommendations.filter((r) => r.severity === 'NO_ACTION_NEEDED').map((r) => r.drug)),
    ];

    const pharmacogenomicRiskScore = computeRiskScore(recommendations);

    const drugResponseProfile: DrugResponseProfile = {
      patientId: input.patientId,
      riskGenes,
      safeDrugs,
      contraindicatedDrugs: [...contraindicatedDrugs, ...avoidDrugs],
      doseAdjustedDrugs,
      pharmacogenomicRiskScore,
      generatedAt: new Date(),
    };

    const profile = new PharmacogenomicProfile({
      patientId: input.patientId,
      genotypes: input.genotypes,
      phenotypes,
      recommendations,
      drugResponseProfile,
      medicationOptimizationScores: [],
      analysedMedications: input.medications.map((m) => m.toLowerCase()),
    });

    return {
      profile,
      phenotypes,
      recommendations,
      drugResponseProfile,
      optimizationScores: [],
    };
  }
}
