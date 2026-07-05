// Classificações baseadas em padrões internacionais (WHO / AHA / ADA)

export type BmiClassification =
  | 'Abaixo do peso'
  | 'Peso normal'
  | 'Sobrepeso'
  | 'Obesidade Grau I'
  | 'Obesidade Grau II'
  | 'Obesidade Grau III';

export type BloodPressureClassification =
  | 'Normal'
  | 'Elevada'
  | 'Hipertensão Estágio 1'
  | 'Hipertensão Estágio 2'
  | 'Crise Hipertensiva';

export type GlucoseClassification =
  | 'Hipoglicemia'
  | 'Normal'
  | 'Pré-diabetes'
  | 'Diabetes';

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(2));
}

export function classifyBmi(bmi: number): BmiClassification {
  if (bmi < 18.5) return 'Abaixo do peso';
  if (bmi < 25.0) return 'Peso normal';
  if (bmi < 30.0) return 'Sobrepeso';
  if (bmi < 35.0) return 'Obesidade Grau I';
  if (bmi < 40.0) return 'Obesidade Grau II';
  return 'Obesidade Grau III';
}

export function calculateWaistHipRatio(waistCm: number, hipCm: number): number {
  return parseFloat((waistCm / hipCm).toFixed(3));
}

// AHA 2017 guidelines
export function classifyBloodPressure(
  systolic: number,
  diastolic: number,
): BloodPressureClassification {
  if (systolic >= 180 || diastolic >= 120) return 'Crise Hipertensiva';
  if (systolic >= 140 || diastolic >= 90) return 'Hipertensão Estágio 2';
  if (systolic >= 130 || diastolic >= 80) return 'Hipertensão Estágio 1';
  if (systolic >= 120 && diastolic < 80) return 'Elevada';
  return 'Normal';
}

// ADA fasting glucose criteria (mg/dL)
export function classifyBloodGlucose(glucoseMgDl: number): GlucoseClassification {
  if (glucoseMgDl < 70) return 'Hipoglicemia';
  if (glucoseMgDl < 100) return 'Normal';
  if (glucoseMgDl < 126) return 'Pré-diabetes';
  return 'Diabetes';
}
