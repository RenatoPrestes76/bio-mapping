export const METRICS = {
  BLOOD_PRESSURE: 'blood_pressure',
  GLYCEMIC: 'glycemic',
  LIPID_PROFILE: 'lipid_profile',
  BMI: 'bmi',
  CARDIOVASCULAR_RISK: 'cardiovascular_risk',
} as const;

export type MetricKey = (typeof METRICS)[keyof typeof METRICS];

export const ALL_METRICS: string[] = Object.values(METRICS);

export const METRIC_RULE_MAP: Record<string, string> = {
  [METRICS.BLOOD_PRESSURE]: 'HYPERTENSION_UNCONTROLLED',
  [METRICS.GLYCEMIC]: 'DIABETES_HIGH_RISK',
  [METRICS.LIPID_PROFILE]: 'DYSLIPIDEMIA_SIGNIFICANT',
  [METRICS.BMI]: 'SEVERE_OBESITY',
};

export const METRIC_TRIGGER_FIELD_MAP: Record<string, string> = {
  [METRICS.BLOOD_PRESSURE]: 'bp_systolic',
  [METRICS.GLYCEMIC]: 'hba1c',
  [METRICS.LIPID_PROFILE]: 'ldl',
  [METRICS.BMI]: 'bmi',
};
