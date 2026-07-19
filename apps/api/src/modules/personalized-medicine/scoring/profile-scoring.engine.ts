import { PatientProfile } from '../entities/patient-profile.entity.js';

export interface ProfileScores {
  metabolicScore: number;
  cardiovascularScore: number;
  lifestyleScore: number;
  inflammatoryScore: number;
  overallRiskScore: number;
  overallHealthScore: number;
}

export class ProfileScoringEngine {
  score(profile: PatientProfile): ProfileScores {
    const metabolicScore = this.computeMetabolicScore(profile);
    const cardiovascularScore = this.computeCardiovascularScore(profile);
    const lifestyleScore = this.computeLifestyleScore(profile);
    const inflammatoryScore = this.computeInflammatoryScore(profile);
    const overallRiskScore = Math.min(100,
      metabolicScore * 0.35 + cardiovascularScore * 0.35 + inflammatoryScore * 0.30,
    );
    const overallHealthScore = Math.max(0, Math.min(100,
      100 - overallRiskScore * 0.70 + lifestyleScore * 0.30,
    ));

    return {
      metabolicScore,
      cardiovascularScore,
      lifestyleScore,
      inflammatoryScore,
      overallRiskScore,
      overallHealthScore,
    };
  }

  private computeMetabolicScore(profile: PatientProfile): number {
    let score = 0;
    const bmi = profile.computeBMI();
    if (bmi) {
      if (bmi >= 35) score += 25;
      else if (bmi >= 30) score += 18;
      else if (bmi >= 25) score += 8;
    }

    const glucose = profile.getBiomarker('fasting_glucose') ?? profile.getBiomarker('glicemia');
    if (glucose) {
      if (glucose.value >= 200) score += 30;
      else if (glucose.value >= 126) score += 22;
      else if (glucose.value >= 100) score += 12;
    }

    const hba1c = profile.getBiomarker('hba1c');
    if (hba1c) {
      if (hba1c.value >= 9) score += 30;
      else if (hba1c.value >= 6.5) score += 22;
      else if (hba1c.value >= 5.7) score += 10;
    }

    const tg = profile.getBiomarker('triglycerides') ?? profile.getBiomarker('triglicerideos');
    if (tg) {
      if (tg.value >= 500) score += 20;
      else if (tg.value >= 200) score += 12;
      else if (tg.value >= 150) score += 6;
    }

    return Math.min(100, score);
  }

  private computeCardiovascularScore(profile: PatientProfile): number {
    let score = 0;

    const sbp = profile.getBiomarker('systolic_bp') ?? profile.getBiomarker('pas');
    if (sbp) {
      if (sbp.value >= 180) score += 30;
      else if (sbp.value >= 160) score += 22;
      else if (sbp.value >= 140) score += 14;
    }

    const ldl = profile.getBiomarker('ldl');
    if (ldl) {
      if (ldl.value >= 250) score += 25;
      else if (ldl.value >= 190) score += 18;
      else if (ldl.value >= 160) score += 10;
    }

    if (profile.isSmoker()) score += 25;

    if (
      profile.hasFamilyHistory('infarto') ||
      profile.hasFamilyHistory('cardiac') ||
      profile.hasFamilyHistory('cardiovascular')
    ) {
      score += 15;
    }

    if (profile.demographics.age >= 65) score += 15;
    else if (profile.demographics.age >= 55) score += 8;
    else if (profile.demographics.age >= 45) score += 4;

    return Math.min(100, score);
  }

  private computeLifestyleScore(profile: PatientProfile): number {
    let score = 0;

    const weeklyMinutes = profile.physicalActivity.weeklyMinutes;
    if (weeklyMinutes !== undefined) {
      if (weeklyMinutes >= 300) score += 30;
      else if (weeklyMinutes >= 150) score += 22;
      else if (weeklyMinutes >= 60) score += 10;
    } else if (
      profile.lifestyle.physicalActivity === 'VIGOROUS' ||
      profile.lifestyle.physicalActivity === 'MODERATE'
    ) {
      score += 22;
    } else if (profile.lifestyle.physicalActivity === 'LIGHT') {
      score += 10;
    }

    if (!profile.isSmoker()) score += 25;

    const sleepHours = profile.sleep.averageHours;
    if (sleepHours !== undefined) {
      if (sleepHours >= 7 && sleepHours <= 9) score += 20;
      else if (sleepHours >= 6) score += 10;
    }

    const stressLevel = profile.stress.level;
    if (stressLevel === 'LOW') score += 15;
    else if (stressLevel === 'MODERATE') score += 8;

    const dietType = profile.nutrition.dietType;
    if (dietType === 'MEDITERRANEAN' || dietType === 'WHOLE_FOODS') score += 10;
    else if (dietType === 'BALANCED') score += 6;

    return Math.min(100, score);
  }

  private computeInflammatoryScore(profile: PatientProfile): number {
    let score = 0;

    const crp = profile.getBiomarker('crp') ?? profile.getBiomarker('pcr');
    if (crp) {
      if (crp.value >= 10) score += 35;
      else if (crp.value >= 2) score += 20;
      else if (crp.value >= 1) score += 10;
    }

    const bmi = profile.computeBMI();
    if (bmi) {
      if (bmi >= 35) score += 25;
      else if (bmi >= 30) score += 18;
    }

    if (profile.isSmoker()) score += 20;
    if (profile.isSedentary()) score += 20;

    return Math.min(100, score);
  }
}
