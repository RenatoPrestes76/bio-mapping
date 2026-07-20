import type { GeneticVariant } from '../entities/genetic-variant.entity.js';
import type { VariantAnnotation } from '../entities/variant-annotation.entity.js';
import type { ClassificationResult } from './variant-classification.engine.js';
import type { PhenotypeAssociationResult } from './phenotype-association.engine.js';
import type { GeneImpactSummary } from './gene-impact.engine.js';

export interface ClinicalActionability {
  level: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';
  description: string;
  therapeuticImplications: string[];
  diagnosticImplications: string[];
  screeningImplications: string[];
}

export interface GenomicReport {
  patientId: string;
  geneSymbol: string;
  variantSummary: string;
  clinicalSignificance: string;
  actionability: ClinicalActionability;
  phenotypeAssociations: string[];
  pharmacogenomicFlags: string[];
  geneticCounselingRecommended: boolean;
  followUpRecommendations: string[];
  limitations: string[];
  generatedAt: Date;
  reportVersion: string;
}

export interface ClinicalGenomicsSummary {
  patientId: string;
  totalVariantsAnalyzed: number;
  clinicallySignificantCount: number;
  highRiskGenes: string[];
  actionableVariants: string[];
  pharmacogenomicFindings: string[];
  overallRiskLevel: 'HIGH' | 'MODERATE' | 'LOW' | 'UNDETERMINED';
  reports: GenomicReport[];
  generatedAt: Date;
}

const PHARMACOGENOMIC_GENES = new Set(['CYP2C19', 'CYP2D6', 'CYP2C9', 'CYP3A4', 'DPYD', 'TPMT', 'UGT1A1']);

export class ClinicalGenomicsEngine {
  generateSummary(
    patientId: string,
    variantGroups: Array<{
      variant: GeneticVariant;
      annotation: VariantAnnotation;
      classification: ClassificationResult;
      phenotypeResult: PhenotypeAssociationResult;
      geneImpact: GeneImpactSummary;
    }>,
  ): ClinicalGenomicsSummary {
    const clinicallySignificant = variantGroups.filter((g) =>
      g.variant.isLikelyClinicallySignificant(),
    );

    const highRiskGenes = [
      ...new Set(
        variantGroups
          .filter((g) => g.geneImpact.overallRiskScore >= 40)
          .map((g) => g.variant.geneSymbol),
      ),
    ];

    const actionableVariants = clinicallySignificant
      .filter((g) => g.phenotypeResult.actionableFindings.length > 0)
      .map((g) => `${g.variant.geneSymbol}:${g.variant.hgvs.coding ?? g.variant.id}`);

    const pharmacogenomicFindings = variantGroups
      .filter((g) => PHARMACOGENOMIC_GENES.has(g.variant.geneSymbol))
      .map((g) => `${g.variant.geneSymbol}: ${g.classification.acmgResult.classification}`);

    const overallRiskLevel = this.computeOverallRisk(clinicallySignificant.length, highRiskGenes.length);

    const reports = variantGroups.map((g) =>
      this.generateReport(patientId, g.variant, g.annotation, g.classification, g.phenotypeResult),
    );

    return {
      patientId,
      totalVariantsAnalyzed: variantGroups.length,
      clinicallySignificantCount: clinicallySignificant.length,
      highRiskGenes,
      actionableVariants,
      pharmacogenomicFindings,
      overallRiskLevel,
      reports,
      generatedAt: new Date(),
    };
  }

  generateReport(
    patientId: string,
    variant: GeneticVariant,
    annotation: VariantAnnotation,
    classification: ClassificationResult,
    phenotype: PhenotypeAssociationResult,
  ): GenomicReport {
    const actionability = this.assessActionability(variant, annotation, classification);
    const pharmacogenomicFlags = PHARMACOGENOMIC_GENES.has(variant.geneSymbol)
      ? [`${variant.geneSymbol} variant may affect drug metabolism`]
      : [];

    const geneticCounselingRecommended =
      actionability.level === 'TIER_1' || actionability.level === 'TIER_2';

    return {
      patientId,
      geneSymbol: variant.geneSymbol,
      variantSummary: this.buildVariantSummary(variant),
      clinicalSignificance: classification.acmgResult.classification,
      actionability,
      phenotypeAssociations: phenotype.associatedConditions,
      pharmacogenomicFlags,
      geneticCounselingRecommended,
      followUpRecommendations: [
        ...phenotype.actionableFindings,
        ...actionability.therapeuticImplications.slice(0, 2),
      ],
      limitations: [
        'Analysis is limited to in-silico predictions without wet-lab confirmation',
        'Population frequency data may not represent all ethnic groups',
        'Pathogenicity classification may change as new evidence emerges',
      ],
      generatedAt: new Date(),
      reportVersion: '1.0.0',
    };
  }

  private assessActionability(
    variant: GeneticVariant,
    annotation: VariantAnnotation,
    classification: ClassificationResult,
  ): ClinicalActionability {
    const sig = classification.acmgResult.classification;
    const geneSymbol = variant.geneSymbol;

    if (sig === 'PATHOGENIC') {
      return {
        level: 'TIER_1',
        description: 'Pathogenic variant with strong clinical evidence',
        therapeuticImplications: [`Consider targeted therapy for ${geneSymbol} pathway`, 'Refer to disease specialist'],
        diagnosticImplications: ['Confirm diagnosis with clinical correlation'],
        screeningImplications: ['Cascade testing of first-degree relatives recommended'],
      };
    }

    if (sig === 'LIKELY_PATHOGENIC') {
      return {
        level: 'TIER_2',
        description: 'Likely pathogenic variant requiring clinical correlation',
        therapeuticImplications: ['Discuss therapeutic options with specialist'],
        diagnosticImplications: ['Additional clinical testing may be needed to confirm'],
        screeningImplications: ['Consider family history review'],
      };
    }

    if (sig === 'UNCERTAIN_SIGNIFICANCE') {
      return {
        level: 'TIER_3',
        description: 'Variant of uncertain significance — not sufficient for clinical action alone',
        therapeuticImplications: [],
        diagnosticImplications: ['Variant reclassification may occur as evidence accumulates'],
        screeningImplications: ['No cascade testing recommended based on VUS alone'],
      };
    }

    return {
      level: 'TIER_4',
      description: 'Benign or likely benign variant — no clinical action required',
      therapeuticImplications: [],
      diagnosticImplications: [],
      screeningImplications: [],
    };
  }

  private buildVariantSummary(variant: GeneticVariant): string {
    const hgvs = variant.hgvs.coding ?? variant.hgvs.protein ?? `${variant.reference}>${variant.alternate}`;
    const af = variant.getMaxPopulationFrequency();
    const freqStr = af > 0 ? ` (AF: ${af.toFixed(4)})` : ' (rare)';
    return `${variant.geneSymbol}:${hgvs} [${variant.zygosity}]${freqStr}`;
  }

  private computeOverallRisk(
    significantCount: number,
    highRiskGeneCount: number,
  ): ClinicalGenomicsSummary['overallRiskLevel'] {
    if (significantCount === 0 && highRiskGeneCount === 0) return 'LOW';
    if (significantCount >= 2 || highRiskGeneCount >= 2) return 'HIGH';
    if (significantCount >= 1 || highRiskGeneCount >= 1) return 'MODERATE';
    return 'UNDETERMINED';
  }
}
