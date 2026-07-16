import {
  calculateBmi,
  calculateBmr,
  calculateFatMass,
  calculateIdealWeight,
  calculateLeanMass,
  calculateObesityIndex,
  calculateTdee,
  calculateWaistHeightRatio,
  classifyBmi,
  classifyBody,
  computeBodyMetrics,
  estimateBodyFatNavyMale,
  estimateBodyFatPctBmi,
  scoreBody,
} from '@bio/bioscore-engine';

describe('Body Calculator', () => {
  // ── BMI ──────────────────────────────────────────────────────────────────

  describe('calculateBmi', () => {
    it.each([
      [70, 175, 22.86],
      [90, 170, 31.14],
      [50, 160, 19.53],
    ])('weight=%dkg height=%dcm → %f', (w, h, expected) => {
      expect(calculateBmi(w, h)).toBe(expected);
    });
  });

  describe('classifyBmi', () => {
    it.each([
      [17, 'Abaixo do peso'],
      [22, 'Peso normal'],
      [27, 'Sobrepeso'],
      [32, 'Obesidade Grau I'],
      [37, 'Obesidade Grau II'],
      [42, 'Obesidade Grau III'],
    ])('bmi=%d → %s', (bmi, expected) => {
      expect(classifyBmi(bmi)).toBe(expected);
    });
  });

  // ── Ideal Weight ──────────────────────────────────────────────────────────

  describe('calculateIdealWeight', () => {
    it('Devine male 175cm → ~70.5kg', () => {
      // 175cm = 68.9 inches → 8.9 over 5ft → 50 + 2.3×8.9 = 70.5
      const result = calculateIdealWeight(175, 'MALE');
      expect(result).toBeCloseTo(70.5, 0);
    });

    it('Devine female 165cm → ~56.9kg', () => {
      const result = calculateIdealWeight(165, 'FEMALE');
      expect(result).toBeCloseTo(57.0, 0);
    });
  });

  // ── Body Fat ──────────────────────────────────────────────────────────────

  describe('estimateBodyFatPctBmi', () => {
    it('male 30yo bmi=22 → ~12-18%', () => {
      const bf = estimateBodyFatPctBmi(22, 30, 'MALE');
      expect(bf).toBeGreaterThan(10);
      expect(bf).toBeLessThan(20);
    });

    it('female 30yo bmi=22 → ~24-30%', () => {
      const bf = estimateBodyFatPctBmi(22, 30, 'FEMALE');
      expect(bf).toBeGreaterThan(20);
      expect(bf).toBeLessThan(35);
    });

    it('clamps negative result to 3', () => {
      const bf = estimateBodyFatPctBmi(10, 10, 'MALE');
      expect(bf).toBeGreaterThanOrEqual(3);
    });
  });

  describe('estimateBodyFatNavyMale', () => {
    it('waist=86 neck=38 height=175 → ~24% (Navy formula result)', () => {
      // 86.01×log10(48) - 70.041×log10(175) + 36.76 ≈ 24.2
      const bf = estimateBodyFatNavyMale(86, 38, 175);
      expect(bf).toBeGreaterThan(18);
      expect(bf).toBeLessThan(30);
    });
  });

  // ── Lean / Fat Mass ───────────────────────────────────────────────────────

  describe('calculateLeanMass', () => {
    it('80kg at 20% BF → 64kg lean', () => {
      expect(calculateLeanMass(80, 20)).toBe(64);
    });
  });

  describe('calculateFatMass', () => {
    it('80kg at 20% BF → 16kg fat', () => {
      expect(calculateFatMass(80, 20)).toBe(16);
    });
  });

  // ── WHtR ──────────────────────────────────────────────────────────────────

  describe('calculateWaistHeightRatio', () => {
    it('waist=80 height=175 → 0.46', () => {
      expect(calculateWaistHeightRatio(80, 175)).toBe(0.46);
    });
  });

  // ── BMR ───────────────────────────────────────────────────────────────────

  describe('calculateBmr', () => {
    it('male 70kg 175cm 30yo → ~1649kcal', () => {
      // Mifflin-St Jeor: 10×70 + 6.25×175 - 5×30 + 5 = 1649
      const bmr = calculateBmr(70, 175, 30, 'MALE');
      expect(bmr).toBeGreaterThan(1600);
      expect(bmr).toBeLessThan(1800);
    });

    it('female 60kg 165cm 30yo → ~1320kcal', () => {
      // 10×60 + 6.25×165 - 5×30 - 161 = 1320
      const bmr = calculateBmr(60, 165, 30, 'FEMALE');
      expect(bmr).toBeGreaterThan(1200);
      expect(bmr).toBeLessThan(1450);
    });
  });

  // ── TDEE ──────────────────────────────────────────────────────────────────

  describe('calculateTdee', () => {
    it('SEDENTARY multiplies BMR by 1.2', () => {
      const bmr = 1700;
      expect(calculateTdee(bmr, 'SEDENTARY')).toBe(Math.round(bmr * 1.2));
    });

    it('VERY_ACTIVE multiplies BMR by 1.9', () => {
      const bmr = 1700;
      expect(calculateTdee(bmr, 'VERY_ACTIVE')).toBe(Math.round(bmr * 1.9));
    });
  });

  // ── Obesity Index ─────────────────────────────────────────────────────────

  describe('calculateObesityIndex', () => {
    it('bmi=22 → index=100', () => {
      expect(calculateObesityIndex(22)).toBe(100);
    });

    it('bmi=33 → index=150', () => {
      expect(calculateObesityIndex(33)).toBe(150);
    });
  });

  // ── Body Classification ───────────────────────────────────────────────────

  describe('classifyBody', () => {
    it.each([
      [17, undefined, 'Abaixo do peso'],
      [22, 0.45, 'Saudável'],
      [22, 0.55, 'Risco abdominal'],
      [27, 0.45, 'Sobrepeso'],
      [32, undefined, 'Obesidade I'],
      [37, undefined, 'Obesidade II'],
      [42, undefined, 'Obesidade III'],
    ])('bmi=%d whr=%s → %s', (bmi, whr, expected) => {
      expect(classifyBody(bmi, whr ?? undefined)).toBe(expected);
    });
  });

  // ── Score ─────────────────────────────────────────────────────────────────

  describe('scoreBody', () => {
    it('ideal BMI + ideal BF → 100', () => {
      expect(scoreBody(22, 14, 'MALE')).toBe(100);
    });

    it('obese BMI → score < 60', () => {
      expect(scoreBody(35, 35, 'MALE')).toBeLessThan(60);
    });
  });

  // ── Integration: computeBodyMetrics ───────────────────────────────────────

  describe('computeBodyMetrics', () => {
    it('returns all fields for a healthy 30yo male', () => {
      const result = computeBodyMetrics({
        weightKg: 75,
        heightCm: 177,
        ageYears: 30,
        gender: 'MALE',
        activityLevel: 'MODERATE',
      });
      expect(result.bmi).toBeGreaterThan(20);
      expect(result.bmi).toBeLessThan(25);
      expect(result.bmiClassification).toBe('Peso normal');
      expect(result.idealWeightKg).toBeGreaterThan(60);
      expect(result.bodyFatPct).toBeGreaterThan(10);
      expect(result.leanMassKg).toBeGreaterThan(50);
      expect(result.fatMassKg).toBeGreaterThan(0);
      expect(result.bmr).toBeGreaterThan(1600);
      expect(result.tdee).toBeGreaterThan(result.bmr);
      expect(result.obesityIndex).toBeGreaterThan(90);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
