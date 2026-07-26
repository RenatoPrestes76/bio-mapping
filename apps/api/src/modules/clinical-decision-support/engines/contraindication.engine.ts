import { Contraindication } from '../entities/contraindication.entity.js';
import type { DecisionContext } from '../entities/decision-context.entity.js';
import { GENETIC_CONTRAINDICATIONS, DISEASE_DRUG_CONTRAINDICATIONS, KNOWN_DRUG_INTERACTIONS } from '../constants/athena.constants.js';

export class ContraindicationEngine {
  analyze(context: DecisionContext): Contraindication[] {
    const contraindications: Contraindication[] = [];

    contraindications.push(...this.checkAllergyContraindications(context));
    contraindications.push(...this.checkGeneticContraindications(context));
    contraindications.push(...this.checkDiseaseContraindications(context));
    contraindications.push(...this.checkDrugDrugInteractions(context));

    return contraindications;
  }

  private checkAllergyContraindications(context: DecisionContext): Contraindication[] {
    const results: Contraindication[] = [];
    const currentMeds = context.getCurrentMedications();

    for (const med of currentMeds) {
      const allergyMatch = context.allergies.find((a) =>
        med.name.toLowerCase().includes(a.toLowerCase()) ||
        a.toLowerCase().includes(med.name.toLowerCase()),
      );

      if (allergyMatch) {
        results.push(
          new Contraindication({
            patientId: context.patientId,
            medication: med.name,
            contraindicationType: 'ALLERGY',
            severity: 'CONTRAINDICATED',
            reason: `Patient has known allergy to ${allergyMatch}`,
            evidenceSummary: 'Allergy documented in patient profile. Immediate substitution required.',
            evidenceLevel: 'A',
            guideline: 'Patient Safety Standard — Allergy Alert',
          }),
        );
      }
    }

    return results;
  }

  private checkGeneticContraindications(context: DecisionContext): Contraindication[] {
    const results: Contraindication[] = [];
    if (!context.geneticProfile) return results;

    const currentMeds = context.getCurrentMedications().map((m) => m.name.toLowerCase());

    for (const [ruleKey, rule] of Object.entries(GENETIC_CONTRAINDICATIONS)) {
      const matchingVariant = context.geneticProfile.variants.find(
        (v) =>
          rule.genes.includes(v.gene.toUpperCase()) &&
          rule.phenotypes.some((p) => v.phenotype?.toUpperCase().includes(p)),
      );

      if (!matchingVariant) continue;

      const matchingDrug = rule.drugs.find((d) =>
        currentMeds.some((m) => m.includes(d) || d.includes(m)),
      );

      if (!matchingDrug) continue;

      results.push(
        new Contraindication({
          patientId: context.patientId,
          medication: matchingDrug,
          contraindicationType: 'GENETIC',
          severity: rule.severity as Contraindication['severity'],
          reason: `Genetic variant ${matchingVariant.gene} (${matchingVariant.haplotype}) phenotype ${matchingVariant.phenotype} is incompatible with ${matchingDrug}`,
          evidenceSummary: `CPIC/DPWG guideline: ${ruleKey}. Gene-drug interaction detected.`,
          evidenceLevel: 'A',
          geneVariant: `${matchingVariant.gene}:${matchingVariant.haplotype}`,
          guideline: 'CPIC/DPWG',
        }),
      );
    }

    return results;
  }

  private checkDiseaseContraindications(context: DecisionContext): Contraindication[] {
    const results: Contraindication[] = [];
    const currentMeds = context.getCurrentMedications().map((m) => m.name.toLowerCase());

    for (const [, rule] of Object.entries(DISEASE_DRUG_CONTRAINDICATIONS)) {
      const matchingCondition = context.conditions.find((c) =>
        rule.conditions.some((rc) => c.toLowerCase().includes(rc)),
      );

      if (!matchingCondition) continue;

      for (const drug of rule.drugs) {
        const matchingMed = currentMeds.find((m) => m.includes(drug) || drug.includes(m));
        if (!matchingMed) continue;

        results.push(
          new Contraindication({
            patientId: context.patientId,
            medication: matchingMed,
            contraindicationType: 'DISEASE_RELATED',
            severity: rule.severity as Contraindication['severity'],
            reason: rule.reason,
            evidenceSummary: `Condition-drug contraindication: ${matchingCondition} + ${matchingMed}`,
            evidenceLevel: 'A',
            conditionName: matchingCondition,
          }),
        );
      }
    }

    return results;
  }

  private checkDrugDrugInteractions(context: DecisionContext): Contraindication[] {
    const results: Contraindication[] = [];
    const currentMeds = context.getCurrentMedications().map((m) => m.name.toLowerCase());

    for (const med of currentMeds) {
      const interactionKey = Object.keys(KNOWN_DRUG_INTERACTIONS).find(
        (k) => med.includes(k) || k.includes(med),
      );
      if (!interactionKey) continue;

      const rule = KNOWN_DRUG_INTERACTIONS[interactionKey];
      const conflicts = rule.conflicts.filter((c) =>
        currentMeds.some((m) => m !== med && (m.includes(c) || c.includes(m))),
      );

      for (const conflict of conflicts) {
        results.push(
          new Contraindication({
            patientId: context.patientId,
            medication: med,
            contraindicationType: 'DRUG_DRUG_INTERACTION',
            severity: rule.severity as Contraindication['severity'],
            reason: rule.reason,
            evidenceSummary: `Drug-drug interaction: ${med} + ${conflict}. ${rule.reason}`,
            evidenceLevel: 'B',
            conflictingAgent: conflict,
          }),
        );
      }
    }

    return results;
  }
}
