import type { MetabolicPhenotype, RecommendationSeverity } from '../entities/drug-gene-interaction.entity.js';
import { getRulesForDrug } from '../guidelines/pgx-knowledge-base.js';

export interface DrugDrugGeneInteraction {
  drug1: string;
  drug2: string;
  sharedGene: string;
  interactionType: 'COMPETITIVE_INHIBITION' | 'ADDITIVE_TOXICITY' | 'EFFICACY_REDUCTION' | 'PHENOCONVERSION';
  severity: RecommendationSeverity;
  description: string;
  clinicalSignificance: 'HIGH' | 'MODERATE' | 'LOW';
}

export interface DrugInteractionAnalysis {
  interactions: DrugDrugGeneInteraction[];
  phenoconversionRisks: PhenoconversionRisk[];
  highRiskPairs: Array<{ drug1: string; drug2: string; reason: string }>;
}

export interface PhenoconversionRisk {
  gene: string;
  currentPhenotype: MetabolicPhenotype;
  predictedPhenotype: MetabolicPhenotype;
  causedBy: string;
  clinicalImplication: string;
}

// Known inhibitors that cause phenoconversion
const CYP_INHIBITORS: Record<string, { potent: string[]; moderate: string[] }> = {
  CYP2D6: {
    potent: ['fluoxetine', 'paroxetine', 'bupropion', 'quinidine'],
    moderate: ['duloxetine', 'terbinafine', 'cinacalcet'],
  },
  CYP2C19: {
    potent: ['omeprazole', 'fluvoxamine', 'ticlopidine'],
    moderate: ['fluoxetine', 'moclobemide', 'esomeprazole'],
  },
  CYP2C9: {
    potent: ['fluconazole', 'amiodarone'],
    moderate: ['fluoxetine', 'voriconazole'],
  },
};

export class DrugInteractionEngine {
  analyzeInteractions(
    medications: string[],
    phenotypes: Map<string, MetabolicPhenotype>,
  ): DrugInteractionAnalysis {
    const interactions: DrugDrugGeneInteraction[] = [];
    const phenoconversionRisks = this.detectPhenoconversionRisks(medications, phenotypes);
    const highRiskPairs: Array<{ drug1: string; drug2: string; reason: string }> = [];

    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const drug1 = medications[i].toLowerCase();
        const drug2 = medications[j].toLowerCase();

        const sharedGenes = this.findSharedGenes(drug1, drug2);
        for (const gene of sharedGenes) {
          const phenotype = phenotypes.get(gene);
          if (!phenotype || phenotype === 'UNKNOWN') continue;

          const interaction = this.buildInteraction(drug1, drug2, gene, phenotype);
          if (interaction) {
            interactions.push(interaction);
            if (interaction.clinicalSignificance === 'HIGH') {
              highRiskPairs.push({
                drug1,
                drug2,
                reason: interaction.description,
              });
            }
          }
        }
      }
    }

    return { interactions, phenoconversionRisks, highRiskPairs };
  }

  private findSharedGenes(drug1: string, drug2: string): string[] {
    const genes1 = new Set(getRulesForDrug(drug1).map((r) => r.gene));
    const genes2 = new Set(getRulesForDrug(drug2).map((r) => r.gene));
    return [...genes1].filter((g) => genes2.has(g));
  }

  private buildInteraction(
    drug1: string,
    drug2: string,
    gene: string,
    phenotype: MetabolicPhenotype,
  ): DrugDrugGeneInteraction | null {
    if (phenotype === 'POOR_METABOLIZER' || phenotype === 'ULTRA_RAPID_METABOLIZER') {
      const severity = phenotype === 'POOR_METABOLIZER' ? 'USE_WITH_CAUTION' : 'MONITOR';
      return {
        drug1,
        drug2,
        sharedGene: gene,
        interactionType: 'COMPETITIVE_INHIBITION',
        severity,
        description: `Both ${drug1} and ${drug2} are ${gene} substrates. ${phenotype} status may amplify toxicity or reduce efficacy for both.`,
        clinicalSignificance: phenotype === 'POOR_METABOLIZER' ? 'HIGH' : 'MODERATE',
      };
    }
    return null;
  }

  private detectPhenoconversionRisks(
    medications: string[],
    phenotypes: Map<string, MetabolicPhenotype>,
  ): PhenoconversionRisk[] {
    const risks: PhenoconversionRisk[] = [];

    for (const [gene, inhibitors] of Object.entries(CYP_INHIBITORS)) {
      const currentPhenotype = phenotypes.get(gene);
      if (!currentPhenotype || currentPhenotype === 'POOR_METABOLIZER') continue;

      for (const drug of medications) {
        const d = drug.toLowerCase();
        if (inhibitors.potent.includes(d)) {
          risks.push({
            gene,
            currentPhenotype,
            predictedPhenotype: 'POOR_METABOLIZER',
            causedBy: drug,
            clinicalImplication: `${drug} is a potent ${gene} inhibitor. Patient may behave as a Poor Metabolizer for other ${gene} substrates while on this medication.`,
          });
        } else if (inhibitors.moderate.includes(d) && currentPhenotype !== 'NORMAL_METABOLIZER') {
          risks.push({
            gene,
            currentPhenotype,
            predictedPhenotype: 'INTERMEDIATE_METABOLIZER',
            causedBy: drug,
            clinicalImplication: `${drug} moderately inhibits ${gene}. Combined with ${currentPhenotype} status, drug exposure may be significantly elevated.`,
          });
        }
      }
    }

    return risks;
  }
}
