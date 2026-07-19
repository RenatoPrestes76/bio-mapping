import { PatientProfile } from '../entities/patient-profile.entity.js';
import { PersonalizationRule, RuleCategory } from '../entities/personalization-rule.entity.js';
import { BUILT_IN_PERSONALIZATION_RULES } from './built-in-rules.js';

export interface PersonalizedRecommendation {
  ruleId: string;
  category: RuleCategory;
  recommendation: string;
  priority: number;
  evidenceLevel: string;
  applicabilityScore: number;
}

export class RecommendationPersonalizer {
  private readonly rules: PersonalizationRule[];

  constructor(rules: PersonalizationRule[] = BUILT_IN_PERSONALIZATION_RULES) {
    this.rules = rules.filter((r) => r.enabled);
  }

  personalize(profile: PatientProfile): PersonalizedRecommendation[] {
    const results: PersonalizedRecommendation[] = [];

    for (const rule of this.rules) {
      const applicabilityScore = this.computeApplicability(rule.condition, profile);
      if (applicabilityScore > 0) {
        results.push({
          ruleId: rule.id,
          category: rule.category,
          recommendation: rule.recommendation,
          priority: rule.priority,
          evidenceLevel: rule.evidenceLevel,
          applicabilityScore: applicabilityScore * rule.weight,
        });
      }
    }

    return results.sort((a, b) => {
      const scoreDiff = b.applicabilityScore - a.applicabilityScore;
      if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
      return b.priority - a.priority;
    });
  }

  private computeApplicability(condition: string, profile: PatientProfile): number {
    switch (condition) {
      case 'cardiovascular_risk':
        return this.cardioRiskScore(profile);
      case 'diabetes':
        return this.diabetesScore(profile);
      case 'hypertension':
        return this.hypertensionScore(profile);
      case 'obesity':
        return this.obesityScore(profile);
      case 'dyslipidemia':
        return this.dyslipidemiaScore(profile);
      case 'metabolic_syndrome':
        return this.metabolicSyndromeScore(profile);
      case 'smoking':
        return profile.isSmoker() ? 1.0 : 0;
      case 'sedentary':
        return profile.isSedentary() ? 1.0 : 0;
      case 'high_stress':
        return this.stressScore(profile);
      case 'sleep_disorder':
        return this.sleepDisorderScore(profile);
      default:
        return profile.hasCondition(condition) ? 0.8 : 0;
    }
  }

  private cardioRiskScore(profile: PatientProfile): number {
    let score = 0;
    if (profile.isSmoker()) score += 0.3;
    if (profile.demographics.age >= 55) score += 0.2;
    if (profile.hasFamilyHistory('infarto') || profile.hasFamilyHistory('cardiac')) score += 0.2;
    const ldl = profile.getBiomarker('ldl');
    if (ldl && ldl.value >= 160) score += 0.2;
    const sbp = profile.getBiomarker('systolic_bp') ?? profile.getBiomarker('pas');
    if (sbp && sbp.value >= 140) score += 0.2;
    if (profile.hasCondition('diabetes') || profile.hasCondition('diabete')) score += 0.15;
    return Math.min(1, score);
  }

  private diabetesScore(profile: PatientProfile): number {
    let score = 0;
    const glucose = profile.getBiomarker('fasting_glucose') ?? profile.getBiomarker('glicemia');
    if (glucose && glucose.value >= 126) score += 0.5;
    else if (glucose && glucose.value >= 100) score += 0.3;
    const hba1c = profile.getBiomarker('hba1c');
    if (hba1c && hba1c.value >= 6.5) score += 0.5;
    else if (hba1c && hba1c.value >= 5.7) score += 0.3;
    if (profile.hasCondition('diabetes') || profile.hasCondition('diabete')) score += 0.4;
    return Math.min(1, score);
  }

  private hypertensionScore(profile: PatientProfile): number {
    const sbp = profile.getBiomarker('systolic_bp') ?? profile.getBiomarker('pas');
    if (sbp && sbp.value >= 140) return 1.0;
    if (profile.hasCondition('hipertensão') || profile.hasCondition('hypertension')) return 0.9;
    if (sbp && sbp.value >= 130) return 0.5;
    return 0;
  }

  private obesityScore(profile: PatientProfile): number {
    const bmi = profile.computeBMI();
    if (bmi && bmi >= 35) return 1.0;
    if (bmi && bmi >= 30) return 0.9;
    if (bmi && bmi >= 27) return 0.4;
    if (profile.hasCondition('obesidade') || profile.hasCondition('obesity')) return 0.8;
    return 0;
  }

  private dyslipidemiaScore(profile: PatientProfile): number {
    let score = 0;
    const ldl = profile.getBiomarker('ldl');
    if (ldl && ldl.value >= 190) score += 0.5;
    else if (ldl && ldl.value >= 160) score += 0.4;
    const tg = profile.getBiomarker('triglycerides') ?? profile.getBiomarker('triglicerideos');
    if (tg && tg.value >= 200) score += 0.4;
    if (profile.hasCondition('dislipidemia') || profile.hasCondition('dyslipidemia')) score += 0.3;
    return Math.min(1, score);
  }

  private metabolicSyndromeScore(profile: PatientProfile): number {
    let criteria = 0;
    const bmi = profile.computeBMI();
    if (bmi && bmi >= 30) criteria++;
    const glucose = profile.getBiomarker('fasting_glucose') ?? profile.getBiomarker('glicemia');
    if (glucose && glucose.value >= 100) criteria++;
    const tg = profile.getBiomarker('triglycerides') ?? profile.getBiomarker('triglicerideos');
    if (tg && tg.value >= 150) criteria++;
    const hdl = profile.getBiomarker('hdl');
    if (hdl && hdl.value <= 50) criteria++;
    const sbp = profile.getBiomarker('systolic_bp') ?? profile.getBiomarker('pas');
    if (sbp && sbp.value >= 130) criteria++;
    if (profile.hasCondition('síndrome metabólica') || profile.hasCondition('metabolic syndrome')) return 1.0;
    return Math.min(1, criteria / 5);
  }

  private stressScore(profile: PatientProfile): number {
    if (profile.stress.level === 'VERY_HIGH') return 1.0;
    if (profile.stress.level === 'HIGH') return 0.85;
    if (profile.stress.level === 'MODERATE') return 0.4;
    return 0;
  }

  private sleepDisorderScore(profile: PatientProfile): number {
    let score = 0;
    if (profile.sleep.disorders && profile.sleep.disorders.length > 0) score += 0.6;
    if (profile.sleep.quality === 'POOR') score += 0.4;
    else if (profile.sleep.quality === 'FAIR') score += 0.2;
    if (profile.sleep.averageHours !== undefined && profile.sleep.averageHours < 6) score += 0.4;
    return Math.min(1, score);
  }
}
