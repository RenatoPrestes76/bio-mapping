import type { ClinicalRecommendationItem, ConflictRecord } from '../entities/clinical-decision.entity.js';
import type { Contraindication } from '../entities/contraindication.entity.js';
import type { DecisionContext } from '../entities/decision-context.entity.js';

export interface ExtendedConflictResult {
  resolvedRecommendations: ClinicalRecommendationItem[];
  conflicts: ConflictRecord[];
  suppressedByContraindication: ClinicalRecommendationItem[];
  geneticConflicts: ClinicalRecommendationItem[];
  allergyConflicts: ClinicalRecommendationItem[];
}

export class RecommendationConflictResolverEngine {
  resolve(
    recommendations: ClinicalRecommendationItem[],
    contraindications: Contraindication[],
    context: DecisionContext,
  ): ExtendedConflictResult {
    const conflicts: ConflictRecord[] = [];
    let active = [...recommendations];

    const { remaining: afterAllergy, suppressed: allergyConflicts } =
      this.filterAllergyConflicts(active, context, conflicts);
    active = afterAllergy;

    const { remaining: afterGenetic, suppressed: geneticConflicts } =
      this.filterGeneticConflicts(active, contraindications, conflicts);
    active = afterGenetic;

    const { remaining: afterCI, suppressed: suppressedByCI } =
      this.filterAbsoluteContraindications(active, contraindications, conflicts);
    active = afterCI;

    return {
      resolvedRecommendations: active,
      conflicts,
      suppressedByContraindication: suppressedByCI,
      geneticConflicts,
      allergyConflicts,
    };
  }

  private filterAllergyConflicts(
    recs: ClinicalRecommendationItem[],
    context: DecisionContext,
    conflicts: ConflictRecord[],
  ): { remaining: ClinicalRecommendationItem[]; suppressed: ClinicalRecommendationItem[] } {
    const suppressed: ClinicalRecommendationItem[] = [];
    const remaining: ClinicalRecommendationItem[] = [];

    for (const rec of recs) {
      const allergyHit = context.allergies.find((a) =>
        rec.action.toLowerCase().includes(a.toLowerCase()),
      );
      if (allergyHit) {
        suppressed.push(rec);
      } else {
        remaining.push(rec);
      }
    }

    if (suppressed.length > 0) {
      conflicts.push({
        id: `conflict-allergy-${Date.now()}`,
        conflictType: 'DRUG_CONTRAINDICATION',
        description: `${suppressed.length} recommendation(s) removed due to known patient allergies.`,
        resolution: 'Allergen-containing recommendations suppressed per patient allergy profile.',
        resolutionStrategy: 'CONTRAINDICATION_WINS',
        affectedRecommendations: suppressed.map((r) => r.id),
        resolvedAt: new Date(),
      });
    }

    return { remaining, suppressed };
  }

  private filterGeneticConflicts(
    recs: ClinicalRecommendationItem[],
    contraindications: Contraindication[],
    conflicts: ConflictRecord[],
  ): { remaining: ClinicalRecommendationItem[]; suppressed: ClinicalRecommendationItem[] } {
    const geneticCIs = contraindications.filter((c) => c.contraindicationType === 'GENETIC');
    const suppressed: ClinicalRecommendationItem[] = [];
    const remaining: ClinicalRecommendationItem[] = [];

    for (const rec of recs) {
      const hit = geneticCIs.find((ci) =>
        rec.action.toLowerCase().includes(ci.medication.toLowerCase()),
      );
      if (hit) {
        suppressed.push(rec);
      } else {
        remaining.push(rec);
      }
    }

    if (suppressed.length > 0) {
      conflicts.push({
        id: `conflict-genetic-${Date.now()}`,
        conflictType: 'DRUG_CONTRAINDICATION',
        description: `${suppressed.length} recommendation(s) suppressed due to pharmacogenomic incompatibilities.`,
        resolution: 'Genetically contraindicated drugs removed. Alternatives should be selected.',
        resolutionStrategy: 'EVIDENCE_HIERARCHY',
        affectedRecommendations: suppressed.map((r) => r.id),
        resolvedAt: new Date(),
      });
    }

    return { remaining, suppressed };
  }

  private filterAbsoluteContraindications(
    recs: ClinicalRecommendationItem[],
    contraindications: Contraindication[],
    conflicts: ConflictRecord[],
  ): { remaining: ClinicalRecommendationItem[]; suppressed: ClinicalRecommendationItem[] } {
    const absoluteCIs = contraindications.filter((c) => c.isAbsolute());
    const suppressed: ClinicalRecommendationItem[] = [];
    const remaining: ClinicalRecommendationItem[] = [];

    for (const rec of recs) {
      const hit = absoluteCIs.find((ci) =>
        rec.action.toLowerCase().includes(ci.medication.toLowerCase()),
      );
      if (hit) {
        suppressed.push(rec);
      } else {
        remaining.push(rec);
      }
    }

    if (suppressed.length > 0) {
      conflicts.push({
        id: `conflict-absolute-ci-${Date.now()}`,
        conflictType: 'DRUG_CONTRAINDICATION',
        description: `${suppressed.length} recommendation(s) removed due to absolute contraindications.`,
        resolution: 'Absolutely contraindicated medications removed from recommendations.',
        resolutionStrategy: 'CONTRAINDICATION_WINS',
        affectedRecommendations: suppressed.map((r) => r.id),
        resolvedAt: new Date(),
      });
    }

    return { remaining, suppressed };
  }
}
