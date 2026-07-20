import type { ClinicalSignificance } from '../entities/genetic-variant.entity.js';

export type ACMGPathogenicCriterion =
  | 'PVS1'
  | 'PS1' | 'PS2' | 'PS3' | 'PS4'
  | 'PM1' | 'PM2' | 'PM3' | 'PM4' | 'PM5' | 'PM6'
  | 'PP1' | 'PP2' | 'PP3' | 'PP4' | 'PP5';

export type ACMGBenignCriterion =
  | 'BA1'
  | 'BS1' | 'BS2' | 'BS3' | 'BS4'
  | 'BP1' | 'BP2' | 'BP3' | 'BP4' | 'BP5' | 'BP6' | 'BP7';

export type ACMGCriterion = ACMGPathogenicCriterion | ACMGBenignCriterion;

export interface ACMGCriterionDescription {
  code: ACMGCriterion;
  weight: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'SUPPORTING' | 'STANDALONE';
  category: 'PATHOGENIC' | 'BENIGN';
  description: string;
}

export const ACMG_CRITERION_DESCRIPTIONS: Record<ACMGCriterion, ACMGCriterionDescription> = {
  PVS1: { code: 'PVS1', weight: 'VERY_STRONG', category: 'PATHOGENIC', description: 'Null variant in a gene where loss-of-function is a known disease mechanism' },
  PS1: { code: 'PS1', weight: 'STRONG', category: 'PATHOGENIC', description: 'Same amino acid change as a previously established pathogenic variant' },
  PS2: { code: 'PS2', weight: 'STRONG', category: 'PATHOGENIC', description: 'De novo (both maternity and paternity confirmed) in a patient with the disease' },
  PS3: { code: 'PS3', weight: 'STRONG', category: 'PATHOGENIC', description: 'Well-established in vitro or in vivo functional studies supportive of a damaging effect' },
  PS4: { code: 'PS4', weight: 'STRONG', category: 'PATHOGENIC', description: 'Prevalence in affected individuals significantly increased compared to controls' },
  PM1: { code: 'PM1', weight: 'MODERATE', category: 'PATHOGENIC', description: 'Located in a mutational hot spot or well-established functional domain' },
  PM2: { code: 'PM2', weight: 'MODERATE', category: 'PATHOGENIC', description: 'Absent or extremely low frequency in population databases (AF < 0.001)' },
  PM3: { code: 'PM3', weight: 'MODERATE', category: 'PATHOGENIC', description: 'For recessive disorders, detected in trans with a pathogenic variant' },
  PM4: { code: 'PM4', weight: 'MODERATE', category: 'PATHOGENIC', description: 'Protein length changes due to in-frame insertions/deletions' },
  PM5: { code: 'PM5', weight: 'MODERATE', category: 'PATHOGENIC', description: 'Novel missense change at amino acid residue where a different pathogenic missense exists' },
  PM6: { code: 'PM6', weight: 'MODERATE', category: 'PATHOGENIC', description: 'Assumed de novo, but without confirmation of paternity and maternity' },
  PP1: { code: 'PP1', weight: 'SUPPORTING', category: 'PATHOGENIC', description: 'Co-segregation with disease in multiple affected family members' },
  PP2: { code: 'PP2', weight: 'SUPPORTING', category: 'PATHOGENIC', description: 'Missense variant in a gene with low rate of benign missense variants' },
  PP3: { code: 'PP3', weight: 'SUPPORTING', category: 'PATHOGENIC', description: 'Multiple lines of computational evidence support deleterious effect' },
  PP4: { code: 'PP4', weight: 'SUPPORTING', category: 'PATHOGENIC', description: 'Patient phenotype/family history is highly specific for a disease with single genetic etiology' },
  PP5: { code: 'PP5', weight: 'SUPPORTING', category: 'PATHOGENIC', description: 'Reputable source recently reports variant as pathogenic' },
  BA1: { code: 'BA1', weight: 'STANDALONE', category: 'BENIGN', description: 'Allele frequency > 5% in large population databases (gnomAD)' },
  BS1: { code: 'BS1', weight: 'STRONG', category: 'BENIGN', description: 'Allele frequency is greater than expected for disorder (AF > 1%)' },
  BS2: { code: 'BS2', weight: 'STRONG', category: 'BENIGN', description: 'Observed in healthy adult with full penetrance expected at early age' },
  BS3: { code: 'BS3', weight: 'STRONG', category: 'BENIGN', description: 'Well-established functional studies show no damaging effect' },
  BS4: { code: 'BS4', weight: 'STRONG', category: 'BENIGN', description: 'Lack of segregation in affected members of family' },
  BP1: { code: 'BP1', weight: 'SUPPORTING', category: 'BENIGN', description: 'Missense variant in a gene where primarily truncating variants cause disease' },
  BP2: { code: 'BP2', weight: 'SUPPORTING', category: 'BENIGN', description: 'Observed in trans with a pathogenic variant for a dominant gene' },
  BP3: { code: 'BP3', weight: 'SUPPORTING', category: 'BENIGN', description: 'In-frame insertions/deletions in repetitive region without known function' },
  BP4: { code: 'BP4', weight: 'SUPPORTING', category: 'BENIGN', description: 'Multiple lines of computational evidence suggest no impact on gene/protein function' },
  BP5: { code: 'BP5', weight: 'SUPPORTING', category: 'BENIGN', description: 'Variant found in case with an alternate molecular basis for disease' },
  BP6: { code: 'BP6', weight: 'SUPPORTING', category: 'BENIGN', description: 'Reputable source recently reports variant as benign' },
  BP7: { code: 'BP7', weight: 'SUPPORTING', category: 'BENIGN', description: 'Synonymous variant for which splicing prediction algorithms predict no impact' },
};

export interface ACMGClassificationResult {
  pathogenicCriteria: ACMGPathogenicCriterion[];
  benignCriteria: ACMGBenignCriterion[];
  classification: ClinicalSignificance;
  pathogenicScore: number;
  benignScore: number;
  rationale: string;
}

const PATHOGENIC_WEIGHTS: Record<string, number> = {
  VERY_STRONG: 8, STRONG: 4, MODERATE: 2, SUPPORTING: 1,
};

const BENIGN_WEIGHTS: Record<string, number> = {
  STANDALONE: 100, STRONG: 4, SUPPORTING: 1,
};

export function classifyByACMG(criteria: ACMGCriterion[]): ACMGClassificationResult {
  const pathogenicCriteria = criteria.filter((c): c is ACMGPathogenicCriterion =>
    ACMG_CRITERION_DESCRIPTIONS[c]?.category === 'PATHOGENIC',
  );
  const benignCriteria = criteria.filter((c): c is ACMGBenignCriterion =>
    ACMG_CRITERION_DESCRIPTIONS[c]?.category === 'BENIGN',
  );

  let pathogenicScore = 0;
  for (const c of pathogenicCriteria) {
    const weight = PATHOGENIC_WEIGHTS[ACMG_CRITERION_DESCRIPTIONS[c].weight] ?? 0;
    pathogenicScore += weight;
  }

  let benignScore = 0;
  for (const c of benignCriteria) {
    const weight = BENIGN_WEIGHTS[ACMG_CRITERION_DESCRIPTIONS[c].weight] ?? 0;
    benignScore += weight;
  }

  const hasPVS1 = pathogenicCriteria.includes('PVS1');
  const strongCount = pathogenicCriteria.filter((c) => ACMG_CRITERION_DESCRIPTIONS[c].weight === 'STRONG').length;
  const moderateCount = pathogenicCriteria.filter((c) => ACMG_CRITERION_DESCRIPTIONS[c].weight === 'MODERATE').length;
  const supportingCount = pathogenicCriteria.filter((c) => ACMG_CRITERION_DESCRIPTIONS[c].weight === 'SUPPORTING').length;
  const hasBA1 = benignCriteria.includes('BA1');
  const strongBenignCount = benignCriteria.filter((c) => ACMG_CRITERION_DESCRIPTIONS[c].weight === 'STRONG').length;
  const supportingBenignCount = benignCriteria.filter((c) => ACMG_CRITERION_DESCRIPTIONS[c].weight === 'SUPPORTING').length;

  let classification: ClinicalSignificance;
  let rationale: string;

  if (hasBA1 || strongBenignCount >= 2) {
    classification = 'BENIGN';
    rationale = hasBA1 ? 'BA1 standalone criterion met (high population frequency)' : '≥2 strong benign criteria';
  } else if ((strongBenignCount === 1 && supportingBenignCount >= 1) || supportingBenignCount >= 2) {
    classification = 'LIKELY_BENIGN';
    rationale = 'Likely benign: BS+BP or ≥2BP criteria';
  } else if (
    (hasPVS1 && strongCount >= 1) ||
    (hasPVS1 && moderateCount >= 2) ||
    strongCount >= 2 ||
    (strongCount === 1 && moderateCount >= 3) ||
    (strongCount === 1 && moderateCount >= 2 && supportingCount >= 2) ||
    (strongCount === 1 && moderateCount >= 1 && supportingCount >= 4)
  ) {
    classification = 'PATHOGENIC';
    rationale = 'Pathogenic: ACMG classification rules met';
  } else if (
    (hasPVS1 && moderateCount >= 1) ||
    (strongCount === 1 && moderateCount >= 1 && moderateCount <= 2) ||
    (strongCount === 1 && supportingCount >= 2) ||
    moderateCount >= 3 ||
    (moderateCount >= 2 && supportingCount >= 2) ||
    (moderateCount === 1 && supportingCount >= 4) ||
    pathogenicScore >= 6
  ) {
    classification = 'LIKELY_PATHOGENIC';
    rationale = 'Likely pathogenic: moderate/strong evidence combination';
  } else {
    classification = 'UNCERTAIN_SIGNIFICANCE';
    rationale = 'Insufficient evidence for classification';
  }

  return { pathogenicCriteria, benignCriteria, classification, pathogenicScore, benignScore, rationale };
}
