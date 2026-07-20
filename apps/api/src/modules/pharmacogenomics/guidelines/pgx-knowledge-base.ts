import type { MetabolicPhenotype, RecommendationSeverity, PGxEvidenceLevel } from '../entities/drug-gene-interaction.entity.js';

export interface DrugGeneRule {
  drug: string;
  gene: string;
  phenotype: MetabolicPhenotype;
  severity: RecommendationSeverity;
  recommendation: string;
  alternativeMedications: string[];
  guidelineSource: string;
  evidenceLevel: PGxEvidenceLevel;
  clinicalRationale: string;
  doseAdjustmentFactor?: number;
  notes?: string;
}

export const PGX_DRUG_GENE_RULES: DrugGeneRule[] = [

  // ── CYP2C19 + Clopidogrel ────────────────────────────────────────────────
  {
    drug: 'clopidogrel', gene: 'CYP2C19', phenotype: 'POOR_METABOLIZER',
    severity: 'CONTRAINDICATED',
    recommendation: 'Avoid clopidogrel. Use alternative antiplatelet: prasugrel or ticagrelor.',
    alternativeMedications: ['prasugrel', 'ticagrelor'],
    guidelineSource: 'CPIC 2022', evidenceLevel: 'A',
    clinicalRationale: 'CYP2C19 Poor Metabolizers cannot convert clopidogrel to its active metabolite, resulting in inadequate platelet inhibition and significantly increased risk of major adverse cardiovascular events (MACE).',
  },
  {
    drug: 'clopidogrel', gene: 'CYP2C19', phenotype: 'INTERMEDIATE_METABOLIZER',
    severity: 'USE_WITH_CAUTION',
    recommendation: 'Consider alternative antiplatelet (prasugrel or ticagrelor) especially in high-cardiovascular-risk patients.',
    alternativeMedications: ['prasugrel', 'ticagrelor'],
    guidelineSource: 'CPIC 2022', evidenceLevel: 'A',
    clinicalRationale: 'Intermediate Metabolizers have reduced clopidogrel activation and moderately increased cardiovascular risk. Benefits may be maintained for lower-risk ACS patients.',
  },
  {
    drug: 'clopidogrel', gene: 'CYP2C19', phenotype: 'NORMAL_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use clopidogrel at standard dose.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2022', evidenceLevel: 'A',
    clinicalRationale: 'Normal CYP2C19 metabolizers convert clopidogrel to its active metabolite at expected rates.',
  },
  {
    drug: 'clopidogrel', gene: 'CYP2C19', phenotype: 'RAPID_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use clopidogrel at standard dose. No specific dose adjustment required.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2022', evidenceLevel: 'B',
    clinicalRationale: 'Rapid metabolizers have adequate or enhanced conversion. No evidence of harm compared to normal metabolizers.',
  },
  {
    drug: 'clopidogrel', gene: 'CYP2C19', phenotype: 'ULTRA_RAPID_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use clopidogrel at standard dose.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2022', evidenceLevel: 'B',
    clinicalRationale: 'Ultra-rapid CYP2C19 metabolizers activate clopidogrel efficiently. Standard dosing is appropriate.',
  },

  // ── CYP2D6 + Codeine ────────────────────────────────────────────────────
  {
    drug: 'codeine', gene: 'CYP2D6', phenotype: 'POOR_METABOLIZER',
    severity: 'AVOID',
    recommendation: 'Avoid codeine. Use non-opioid analgesics or alternative opioids (morphine, oxycodone).',
    alternativeMedications: ['morphine', 'oxycodone', 'hydromorphone', 'acetaminophen'],
    guidelineSource: 'CPIC 2021', evidenceLevel: 'A',
    clinicalRationale: 'CYP2D6 Poor Metabolizers cannot convert codeine to morphine, resulting in no analgesia. Prescribing codeine is ineffective and unsafe as the parent drug may accumulate.',
  },
  {
    drug: 'codeine', gene: 'CYP2D6', phenotype: 'ULTRA_RAPID_METABOLIZER',
    severity: 'CONTRAINDICATED',
    recommendation: 'Contraindicated. Use alternative opioid (morphine, oxycodone) at lower starting dose with close monitoring.',
    alternativeMedications: ['morphine', 'oxycodone', 'hydromorphone'],
    guidelineSource: 'CPIC 2021', evidenceLevel: 'A',
    clinicalRationale: 'Ultra-Rapid CYP2D6 Metabolizers rapidly convert codeine to morphine, risking life-threatening opioid toxicity (respiratory depression). Fatal cases documented in post-surgical pediatric patients.',
  },
  {
    drug: 'codeine', gene: 'CYP2D6', phenotype: 'INTERMEDIATE_METABOLIZER',
    severity: 'USE_WITH_CAUTION',
    recommendation: 'Use lowest effective codeine dose with monitoring. Consider alternative analgesics.',
    alternativeMedications: ['acetaminophen', 'ibuprofen', 'tramadol (if CYP2D6 not affected)'],
    guidelineSource: 'CPIC 2021', evidenceLevel: 'A',
    clinicalRationale: 'Intermediate Metabolizers convert codeine to morphine at a reduced rate, resulting in reduced analgesia. May still be used with careful monitoring.',
  },
  {
    drug: 'codeine', gene: 'CYP2D6', phenotype: 'NORMAL_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use codeine at standard dose.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2021', evidenceLevel: 'A',
    clinicalRationale: 'Normal metabolizers convert codeine to morphine at expected rate. Standard dosing appropriate.',
  },

  // ── CYP2D6 + Tramadol ───────────────────────────────────────────────────
  {
    drug: 'tramadol', gene: 'CYP2D6', phenotype: 'POOR_METABOLIZER',
    severity: 'AVOID',
    recommendation: 'Avoid tramadol. Use alternative analgesics (acetaminophen, NSAIDs, or different opioids).',
    alternativeMedications: ['acetaminophen', 'ibuprofen', 'morphine', 'oxycodone'],
    guidelineSource: 'CPIC 2021', evidenceLevel: 'A',
    clinicalRationale: 'CYP2D6 Poor Metabolizers cannot convert tramadol to its active O-desmethyltramadol (M1) metabolite, resulting in inadequate analgesia with accumulation of parent compound causing serotonin effects.',
  },
  {
    drug: 'tramadol', gene: 'CYP2D6', phenotype: 'ULTRA_RAPID_METABOLIZER',
    severity: 'AVOID',
    recommendation: 'Avoid tramadol. Risk of CNS/respiratory toxicity due to rapid conversion to active metabolite.',
    alternativeMedications: ['acetaminophen', 'ibuprofen', 'low-dose oxycodone with monitoring'],
    guidelineSource: 'CPIC 2021', evidenceLevel: 'A',
    clinicalRationale: 'Ultra-Rapid Metabolizers convert tramadol to M1 excessively fast, increasing risk of CNS depression, respiratory arrest, and serotonin syndrome.',
  },
  {
    drug: 'tramadol', gene: 'CYP2D6', phenotype: 'NORMAL_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use tramadol at standard dose.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2021', evidenceLevel: 'A',
    clinicalRationale: 'Normal CYP2D6 metabolizers process tramadol at expected rates. Standard dosing appropriate.',
  },

  // ── CYP2D6 + Fluoxetine ─────────────────────────────────────────────────
  {
    drug: 'fluoxetine', gene: 'CYP2D6', phenotype: 'POOR_METABOLIZER',
    severity: 'DOSE_REDUCTION',
    recommendation: 'Reduce fluoxetine dose by 25-50%. Monitor for adverse effects (QTc prolongation, excessive sedation).',
    alternativeMedications: ['citalopram', 'escitalopram', 'sertraline'],
    guidelineSource: 'CPIC 2020', evidenceLevel: 'A',
    clinicalRationale: 'Fluoxetine is primarily metabolized by CYP2D6. Poor Metabolizers have higher drug exposure (AUC), increasing risk of side effects. Additionally, fluoxetine itself is a potent CYP2D6 inhibitor, compounding the effect.',
    doseAdjustmentFactor: 0.5,
    notes: 'Fluoxetine also inhibits CYP2D6 — this creates a phenoconversion risk when other CYP2D6 substrates are co-administered.',
  },
  {
    drug: 'fluoxetine', gene: 'CYP2D6', phenotype: 'NORMAL_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use fluoxetine at standard dose.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2020', evidenceLevel: 'A',
    clinicalRationale: 'Normal CYP2D6 metabolizers process fluoxetine at expected rates.',
  },

  // ── CYP2C19 + Omeprazole ────────────────────────────────────────────────
  {
    drug: 'omeprazole', gene: 'CYP2C19', phenotype: 'POOR_METABOLIZER',
    severity: 'DOSE_REDUCTION',
    recommendation: 'Reduce omeprazole dose. Poor metabolizers have 3-5× higher exposure; standard doses may be excessive.',
    alternativeMedications: ['pantoprazole', 'rabeprazole'],
    guidelineSource: 'DPWG 2022', evidenceLevel: 'A',
    clinicalRationale: 'CYP2C19 Poor Metabolizers have significantly elevated omeprazole plasma levels. While acid suppression is enhanced, excessive exposure may increase risk of adverse effects (B12 deficiency, hypomagnesemia with long-term use).',
    doseAdjustmentFactor: 0.5,
  },
  {
    drug: 'omeprazole', gene: 'CYP2C19', phenotype: 'ULTRA_RAPID_METABOLIZER',
    severity: 'DOSE_INCREASE',
    recommendation: 'Increase omeprazole dose (e.g., 40 mg twice daily) or switch to rabeprazole/pantoprazole.',
    alternativeMedications: ['rabeprazole', 'pantoprazole'],
    guidelineSource: 'DPWG 2022', evidenceLevel: 'A',
    clinicalRationale: 'Ultra-Rapid CYP2C19 Metabolizers clear omeprazole rapidly, resulting in insufficient acid suppression. H. pylori eradication failure rates are higher in this phenotype.',
    doseAdjustmentFactor: 2.0,
  },
  {
    drug: 'omeprazole', gene: 'CYP2C19', phenotype: 'NORMAL_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use omeprazole at standard dose.',
    alternativeMedications: [],
    guidelineSource: 'DPWG 2022', evidenceLevel: 'A',
    clinicalRationale: 'Normal metabolizers have expected omeprazole exposure.',
  },
  {
    drug: 'omeprazole', gene: 'CYP2C19', phenotype: 'INTERMEDIATE_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use omeprazole at standard dose. Exposure slightly elevated but clinically acceptable.',
    alternativeMedications: [],
    guidelineSource: 'DPWG 2022', evidenceLevel: 'B',
    clinicalRationale: 'Intermediate metabolizers have modestly increased exposure; no routine dose adjustment required.',
  },

  // ── CYP2C9 + Warfarin ───────────────────────────────────────────────────
  {
    drug: 'warfarin', gene: 'CYP2C9', phenotype: 'POOR_METABOLIZER',
    severity: 'DOSE_REDUCTION',
    recommendation: 'Reduce warfarin dose by 25-50%. Initiate at lower dose and titrate with frequent INR monitoring.',
    alternativeMedications: ['apixaban', 'rivaroxaban', 'dabigatran'],
    guidelineSource: 'CPIC 2017', evidenceLevel: 'A',
    clinicalRationale: 'CYP2C9 is the primary enzyme metabolizing warfarin S-enantiomer. Poor Metabolizers have 2-3× higher warfarin exposure, increasing major bleeding risk significantly.',
    doseAdjustmentFactor: 0.6,
    notes: 'VKORC1 genotype should also be considered for full warfarin dosing algorithm.',
  },
  {
    drug: 'warfarin', gene: 'CYP2C9', phenotype: 'INTERMEDIATE_METABOLIZER',
    severity: 'DOSE_REDUCTION',
    recommendation: 'Reduce initial warfarin dose by 10-25%. Monitor INR closely during initiation.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2017', evidenceLevel: 'A',
    clinicalRationale: 'Intermediate metabolizers have moderately elevated warfarin exposure. Dose reduction prevents early supratherapeutic INR and bleeding events.',
    doseAdjustmentFactor: 0.8,
  },
  {
    drug: 'warfarin', gene: 'CYP2C9', phenotype: 'NORMAL_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use warfarin at standard dose based on clinical factors.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2017', evidenceLevel: 'A',
    clinicalRationale: 'Normal CYP2C9 metabolizers process warfarin at expected rates.',
  },

  // ── VKORC1 + Warfarin ───────────────────────────────────────────────────
  {
    drug: 'warfarin', gene: 'VKORC1', phenotype: 'POOR_METABOLIZER',
    severity: 'DOSE_REDUCTION',
    recommendation: 'Reduce warfarin dose by 30-40% (VKORC1 -1639A/A). Frequent INR monitoring essential.',
    alternativeMedications: ['apixaban', 'rivaroxaban'],
    guidelineSource: 'CPIC 2017', evidenceLevel: 'A',
    clinicalRationale: 'VKORC1 -1639A/A genotype results in lower VKORC1 enzyme expression, making patients more sensitive to warfarin. Lower doses are required to achieve target INR.',
    doseAdjustmentFactor: 0.65,
  },
  {
    drug: 'warfarin', gene: 'VKORC1', phenotype: 'INTERMEDIATE_METABOLIZER',
    severity: 'DOSE_REDUCTION',
    recommendation: 'Reduce warfarin dose by 15-20% (VKORC1 -1639G/A). Monitor INR at initiation.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2017', evidenceLevel: 'A',
    clinicalRationale: 'Heterozygous VKORC1 -1639G/A results in intermediate VKORC1 expression. Modest dose reduction recommended.',
    doseAdjustmentFactor: 0.82,
  },
  {
    drug: 'warfarin', gene: 'VKORC1', phenotype: 'NORMAL_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use warfarin at standard dose.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2017', evidenceLevel: 'A',
    clinicalRationale: 'VKORC1 -1639G/G (normal) does not alter warfarin sensitivity.',
  },

  // ── SLCO1B1 + Simvastatin ────────────────────────────────────────────────
  {
    drug: 'simvastatin', gene: 'SLCO1B1', phenotype: 'POOR_METABOLIZER',
    severity: 'AVOID',
    recommendation: 'Avoid simvastatin. Use alternative statin (rosuvastatin, pravastatin, or low-dose atorvastatin).',
    alternativeMedications: ['rosuvastatin', 'pravastatin', 'fluvastatin'],
    guidelineSource: 'CPIC 2022', evidenceLevel: 'A',
    clinicalRationale: 'SLCO1B1*5 variant impairs hepatic uptake of simvastatin acid, causing 3-4× higher plasma concentrations and significantly elevated myopathy/rhabdomyolysis risk.',
  },
  {
    drug: 'simvastatin', gene: 'SLCO1B1', phenotype: 'INTERMEDIATE_METABOLIZER',
    severity: 'USE_WITH_CAUTION',
    recommendation: 'Limit simvastatin to ≤20 mg/day. Monitor for muscle symptoms (CK levels). Prefer alternative statin.',
    alternativeMedications: ['rosuvastatin', 'pravastatin'],
    guidelineSource: 'CPIC 2022', evidenceLevel: 'A',
    clinicalRationale: 'SLCO1B1 heterozygous carriers have moderately increased simvastatin acid exposure. Low-dose use reduces but does not eliminate myopathy risk.',
    doseAdjustmentFactor: 0.5,
  },
  {
    drug: 'simvastatin', gene: 'SLCO1B1', phenotype: 'NORMAL_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use simvastatin at standard dose.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2022', evidenceLevel: 'A',
    clinicalRationale: 'Normal SLCO1B1 function ensures adequate hepatic uptake and expected simvastatin exposure.',
  },

  // ── SLCO1B1 + Atorvastatin ──────────────────────────────────────────────
  {
    drug: 'atorvastatin', gene: 'SLCO1B1', phenotype: 'POOR_METABOLIZER',
    severity: 'USE_WITH_CAUTION',
    recommendation: 'Use atorvastatin at lowest effective dose with CK monitoring. Consider rosuvastatin or pravastatin.',
    alternativeMedications: ['rosuvastatin', 'pravastatin', 'fluvastatin'],
    guidelineSource: 'CPIC 2022', evidenceLevel: 'B',
    clinicalRationale: 'SLCO1B1 dysfunction increases atorvastatin exposure by ~2.5×. Myopathy risk is elevated but less than with simvastatin.',
  },
  {
    drug: 'atorvastatin', gene: 'SLCO1B1', phenotype: 'NORMAL_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use atorvastatin at standard dose.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2022', evidenceLevel: 'A',
    clinicalRationale: 'Normal SLCO1B1 function: atorvastatin at standard dose is safe.',
  },

  // ── TPMT + Azathioprine ──────────────────────────────────────────────────
  {
    drug: 'azathioprine', gene: 'TPMT', phenotype: 'POOR_METABOLIZER',
    severity: 'CONTRAINDICATED',
    recommendation: 'Contraindicated. TPMT Poor Metabolizers risk life-threatening myelosuppression. Use alternative (mycophenolate mofetil).',
    alternativeMedications: ['mycophenolate mofetil', 'cyclosporine'],
    guidelineSource: 'CPIC 2018', evidenceLevel: 'A',
    clinicalRationale: 'TPMT Poor Metabolizers accumulate highly cytotoxic thioguanine nucleotides (TGN) when given azathioprine, causing severe, potentially fatal bone marrow suppression within weeks of treatment initiation.',
  },
  {
    drug: 'azathioprine', gene: 'TPMT', phenotype: 'INTERMEDIATE_METABOLIZER',
    severity: 'DOSE_REDUCTION',
    recommendation: 'Reduce azathioprine dose by 30-70% of standard dose. Start low, titrate, and monitor CBC.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2018', evidenceLevel: 'A',
    clinicalRationale: 'Intermediate Metabolizers have reduced TPMT activity and accumulate more TGN than normal metabolizers. Significant dose reduction prevents myelosuppression while maintaining therapeutic efficacy.',
    doseAdjustmentFactor: 0.5,
  },
  {
    drug: 'azathioprine', gene: 'TPMT', phenotype: 'NORMAL_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use azathioprine at standard dose with routine CBC monitoring.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2018', evidenceLevel: 'A',
    clinicalRationale: 'Normal TPMT activity: azathioprine is metabolized appropriately.',
  },

  // ── DPYD + 5-FU ─────────────────────────────────────────────────────────
  {
    drug: '5-fu', gene: 'DPYD', phenotype: 'POOR_METABOLIZER',
    severity: 'CONTRAINDICATED',
    recommendation: 'Contraindicated. DPYD Poor Metabolizers risk life-threatening fluorouracil toxicity. Use alternative chemotherapy.',
    alternativeMedications: ['irinotecan', 'oxaliplatin'],
    guidelineSource: 'CPIC 2018', evidenceLevel: 'A',
    clinicalRationale: 'DPYD degrades >85% of administered 5-FU. Poor Metabolizers accumulate 5-FU and its toxic catabolites, causing severe diarrhea, mucositis, neutropenia, and potentially fatal neurotoxicity.',
  },
  {
    drug: '5-fu', gene: 'DPYD', phenotype: 'INTERMEDIATE_METABOLIZER',
    severity: 'DOSE_REDUCTION',
    recommendation: 'Reduce 5-FU dose by 50% with dose escalation based on toxicity and efficacy.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2018', evidenceLevel: 'A',
    clinicalRationale: 'DPYD Intermediate Metabolizers have reduced fluorouracil clearance. A 50% dose reduction prevents life-threatening toxicity while maintaining anti-tumor activity.',
    doseAdjustmentFactor: 0.5,
  },
  {
    drug: '5-fu', gene: 'DPYD', phenotype: 'NORMAL_METABOLIZER',
    severity: 'NO_ACTION_NEEDED',
    recommendation: 'Use 5-FU at standard dose.',
    alternativeMedications: [],
    guidelineSource: 'CPIC 2018', evidenceLevel: 'A',
    clinicalRationale: 'Normal DPYD activity: 5-FU is metabolized at expected rates.',
  },
];

export function getRulesForDrug(drug: string): DrugGeneRule[] {
  return PGX_DRUG_GENE_RULES.filter((r) => r.drug === drug.toLowerCase());
}

export function getRulesForGene(gene: string): DrugGeneRule[] {
  return PGX_DRUG_GENE_RULES.filter((r) => r.gene === gene.toUpperCase());
}

export function getRule(gene: string, drug: string, phenotype: MetabolicPhenotype): DrugGeneRule | undefined {
  return PGX_DRUG_GENE_RULES.find(
    (r) => r.gene === gene.toUpperCase() && r.drug === drug.toLowerCase() && r.phenotype === phenotype,
  );
}

export const SUPPORTED_DRUGS = new Set([
  'warfarin', 'clopidogrel', 'codeine', 'tramadol', 'fluoxetine',
  'omeprazole', 'atorvastatin', 'simvastatin', 'azathioprine', '5-fu',
]);

export function isSupportedDrug(drug: string): boolean {
  return SUPPORTED_DRUGS.has(drug.toLowerCase());
}
