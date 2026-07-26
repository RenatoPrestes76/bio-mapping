export const ATHENA_VERSION = '1.0.0';
export const ATHENA_MODULE_NAME = 'ATHENA-CDSS';

export const BIOMARKER_ALERT_THRESHOLDS = {
  hba1c: { critical: 10.0, high: 8.5, moderate: 7.0 },
  glucose: { critical: 400, high: 300, moderate: 200, low: 60, criticalLow: 40 },
  ldl: { critical: 250, high: 190, moderate: 160 },
  creatinine: { critical: 5.0, high: 3.0, moderate: 2.0 },
  egfr: { critical: 15, high: 30, moderate: 45 },
  crp: { critical: 50, high: 20, moderate: 10 },
  bp_systolic: { critical: 180, high: 160, moderate: 140 },
  bp_diastolic: { critical: 120, high: 100, moderate: 90 },
  bmi: { critical: 40, high: 35, moderate: 30 },
} as const;

export const KNOWN_DRUG_INTERACTIONS: Record<string, { conflicts: string[]; severity: string; reason: string }> = {
  warfarin: {
    conflicts: ['aspirin', 'ibuprofen', 'naproxen', 'fluconazole', 'amiodarone', 'clopidogrel'],
    severity: 'SEVERE',
    reason: 'Increased bleeding risk — anticoagulant potentiation',
  },
  clopidogrel: {
    conflicts: ['omeprazole', 'esomeprazole', 'aspirin_high_dose'],
    severity: 'MODERATE',
    reason: 'CYP2C19 inhibition may reduce clopidogrel efficacy',
  },
  metformin: {
    conflicts: ['contrast_dye', 'alcohol'],
    severity: 'MODERATE',
    reason: 'Lactic acidosis risk with iodinated contrast; increased hypoglycemia with alcohol',
  },
  statin: {
    conflicts: ['fibrate', 'niacin', 'cyclosporine', 'amiodarone'],
    severity: 'SEVERE',
    reason: 'Myopathy/rhabdomyolysis risk with CYP3A4 inhibitors or combined lipid-lowering agents',
  },
  ace_inhibitor: {
    conflicts: ['potassium', 'arb', 'spironolactone'],
    severity: 'MODERATE',
    reason: 'Hyperkalemia risk from combined RAA blockade',
  },
  ssri: {
    conflicts: ['maoi', 'tramadol', 'triptans', 'lithium'],
    severity: 'SEVERE',
    reason: 'Serotonin syndrome risk',
  },
};

export const GENETIC_CONTRAINDICATIONS: Record<string, { genes: string[]; phenotypes: string[]; drugs: string[]; severity: string }> = {
  codeine_poor_metabolizer: {
    genes: ['CYP2D6'],
    phenotypes: ['POOR_METABOLIZER'],
    drugs: ['codeine', 'tramadol'],
    severity: 'CONTRAINDICATED',
  },
  codeine_ultra_rapid: {
    genes: ['CYP2D6'],
    phenotypes: ['ULTRA_RAPID_METABOLIZER'],
    drugs: ['codeine'],
    severity: 'CONTRAINDICATED',
  },
  clopidogrel_poor: {
    genes: ['CYP2C19'],
    phenotypes: ['POOR_METABOLIZER', 'INTERMEDIATE_METABOLIZER'],
    drugs: ['clopidogrel'],
    severity: 'SEVERE',
  },
  warfarin_vkorc1: {
    genes: ['VKORC1'],
    phenotypes: ['AA'],
    drugs: ['warfarin'],
    severity: 'MODERATE',
  },
  azathioprine_tpmt: {
    genes: ['TPMT'],
    phenotypes: ['POOR_METABOLIZER'],
    drugs: ['azathioprine', 'mercaptopurine'],
    severity: 'CONTRAINDICATED',
  },
  fluorouracil_dpyd: {
    genes: ['DPYD'],
    phenotypes: ['POOR_METABOLIZER'],
    drugs: ['5-fu', 'fluorouracil', 'capecitabine'],
    severity: 'CONTRAINDICATED',
  },
};

export const DISEASE_DRUG_CONTRAINDICATIONS: Record<string, { conditions: string[]; drugs: string[]; severity: string; reason: string }> = {
  ckd_nsaid: {
    conditions: ['ckd', 'renal failure', 'renal insufficiency'],
    drugs: ['ibuprofen', 'naproxen', 'diclofenac', 'ketorolac'],
    severity: 'CONTRAINDICATED',
    reason: 'NSAIDs reduce renal perfusion and accelerate CKD progression',
  },
  copd_beta_blocker: {
    conditions: ['copd', 'asthma', 'bronchospasm'],
    drugs: ['propranolol', 'metoprolol', 'atenolol', 'carvedilol'],
    severity: 'RELATIVE',
    reason: 'Non-selective beta-blockers may worsen bronchospasm',
  },
  heart_failure_nsaid: {
    conditions: ['heart failure', 'cardiac failure', 'chf'],
    drugs: ['ibuprofen', 'naproxen', 'diclofenac'],
    severity: 'SEVERE',
    reason: 'NSAIDs cause sodium retention and worsen heart failure decompensation',
  },
  peptic_ulcer_aspirin: {
    conditions: ['peptic ulcer', 'gastric ulcer', 'gi bleed'],
    drugs: ['aspirin', 'ibuprofen'],
    severity: 'SEVERE',
    reason: 'GI ulceration risk significantly elevated',
  },
};

export const MONITORING_INTERVALS_DAYS: Record<string, number> = {
  hba1c: 90,
  glucose: 30,
  creatinine: 90,
  egfr: 90,
  ldl: 180,
  blood_pressure: 30,
  liver_enzymes: 90,
  cbc: 90,
};
