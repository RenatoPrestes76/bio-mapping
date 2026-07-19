import { PatientProfile } from '../entities/patient-profile.entity.js';
import { ProfileScores } from './profile-scoring.engine.js';

export type RiskLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

export interface AdjustedRisk {
  cardiovascularRisk: RiskLevel;
  metabolicRisk: RiskLevel;
  diabetesRisk: RiskLevel;
  hypertensionRisk: RiskLevel;
  overallRisk: RiskLevel;
  riskFactors: string[];
  protectiveFactors: string[];
}

function toLevel(score: number): RiskLevel {
  if (score < 20) return 'VERY_LOW';
  if (score < 40) return 'LOW';
  if (score < 60) return 'MODERATE';
  if (score < 80) return 'HIGH';
  return 'VERY_HIGH';
}

export class RiskAdjustmentEngine {
  adjustRisk(profile: PatientProfile, scores: ProfileScores): AdjustedRisk {
    const riskFactors = this.identifyRiskFactors(profile);
    const protectiveFactors = this.identifyProtectiveFactors(profile);

    const diabetesRiskScore = this.computeDiabetesRiskScore(profile);
    const hypertensionRiskScore = this.computeHypertensionRiskScore(profile);

    return {
      cardiovascularRisk: toLevel(scores.cardiovascularScore),
      metabolicRisk: toLevel(scores.metabolicScore),
      diabetesRisk: toLevel(diabetesRiskScore),
      hypertensionRisk: toLevel(hypertensionRiskScore),
      overallRisk: toLevel(scores.overallRiskScore),
      riskFactors,
      protectiveFactors,
    };
  }

  private computeDiabetesRiskScore(profile: PatientProfile): number {
    let score = 0;
    const bmi = profile.computeBMI();
    if (bmi && bmi >= 30) score += 25;
    else if (bmi && bmi >= 25) score += 12;

    if (profile.hasFamilyHistory('diabetes') || profile.hasFamilyHistory('diabete')) score += 20;
    if (profile.isSedentary()) score += 15;
    if (profile.demographics.age >= 45) score += 10;
    if (profile.demographics.age >= 65) score += 10;

    const glucose = profile.getBiomarker('fasting_glucose') ?? profile.getBiomarker('glicemia');
    if (glucose && glucose.value >= 100) score += 25;

    return Math.min(100, score);
  }

  private computeHypertensionRiskScore(profile: PatientProfile): number {
    let score = 0;
    if (profile.isSmoker()) score += 20;
    if (profile.isSedentary()) score += 10;
    if (profile.demographics.age >= 65) score += 20;
    else if (profile.demographics.age >= 55) score += 12;
    if (profile.hasFamilyHistory('hipertensão') || profile.hasFamilyHistory('hypertension')) score += 18;
    const bmi = profile.computeBMI();
    if (bmi && bmi >= 30) score += 18;

    const sbp = profile.getBiomarker('systolic_bp') ?? profile.getBiomarker('pas');
    if (sbp && sbp.value >= 130 && sbp.value < 140) score += 12;

    return Math.min(100, score);
  }

  private identifyRiskFactors(profile: PatientProfile): string[] {
    const factors: string[] = [];
    if (profile.isSmoker()) factors.push('Tabagismo ativo');
    if (profile.isSedentary()) factors.push('Sedentarismo');

    const bmi = profile.computeBMI();
    if (bmi && bmi >= 35) factors.push(`Obesidade grau 2+ (IMC ${bmi.toFixed(1)})`);
    else if (bmi && bmi >= 30) factors.push(`Obesidade grau 1 (IMC ${bmi.toFixed(1)})`);
    else if (bmi && bmi >= 25) factors.push(`Sobrepeso (IMC ${bmi.toFixed(1)})`);

    if (profile.demographics.age >= 65) factors.push('Idade avançada (≥ 65 anos)');

    if (profile.hasFamilyHistory('infarto') || profile.hasFamilyHistory('cardiac')) {
      factors.push('História familiar de doença cardiovascular');
    }
    if (profile.hasFamilyHistory('diabetes') || profile.hasFamilyHistory('diabete')) {
      factors.push('História familiar de diabetes');
    }

    const sbp = profile.getBiomarker('systolic_bp') ?? profile.getBiomarker('pas');
    if (sbp && sbp.value >= 140) factors.push(`Hipertensão arterial (PAS ${sbp.value} mmHg)`);

    const glucose = profile.getBiomarker('fasting_glucose') ?? profile.getBiomarker('glicemia');
    if (glucose && glucose.value >= 100) factors.push(`Glicemia elevada (${glucose.value} mg/dL)`);

    const ldl = profile.getBiomarker('ldl');
    if (ldl && ldl.value >= 160) factors.push(`LDL elevado (${ldl.value} mg/dL)`);

    const stress = profile.stress.level;
    if (stress === 'HIGH' || stress === 'VERY_HIGH') factors.push(`Estresse elevado (${stress})`);

    if (profile.sleep.averageHours !== undefined && profile.sleep.averageHours < 6) {
      factors.push(`Sono insuficiente (${profile.sleep.averageHours}h/noite)`);
    }

    return factors;
  }

  private identifyProtectiveFactors(profile: PatientProfile): string[] {
    const factors: string[] = [];

    const weeklyMinutes = profile.physicalActivity.weeklyMinutes;
    if (weeklyMinutes && weeklyMinutes >= 150) {
      factors.push(`Atividade física regular (${weeklyMinutes} min/semana)`);
    }

    if (!profile.isSmoker()) factors.push('Não tabagista');

    if (profile.sleep.averageHours && profile.sleep.averageHours >= 7 && profile.sleep.averageHours <= 9) {
      factors.push(`Sono adequado (${profile.sleep.averageHours}h/noite)`);
    }

    if (profile.nutrition.dietType === 'MEDITERRANEAN' || profile.nutrition.dietType === 'WHOLE_FOODS') {
      factors.push(`Dieta saudável (${profile.nutrition.dietType})`);
    }

    if (profile.stress.level === 'LOW') factors.push('Baixo nível de estresse');

    const hdl = profile.getBiomarker('hdl');
    if (hdl && hdl.value >= 60) factors.push(`HDL protetor (${hdl.value} mg/dL)`);

    return factors;
  }
}
