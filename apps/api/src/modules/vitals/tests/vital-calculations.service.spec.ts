import { VitalCalculationsService } from '../services/vital-calculations.service';

describe('VitalCalculationsService', () => {
  let svc: VitalCalculationsService;

  beforeEach(() => {
    svc = new VitalCalculationsService();
  });

  // ── BMI ────────────────────────────────────────────────────────────────────

  describe('calculateBmi', () => {
    it('calcula IMC corretamente para peso 80 kg altura 175 cm', () => {
      expect(svc.calculateBmi(80, 175)).toBe(26.12);
    });

    it('calcula IMC para peso 60 kg altura 165 cm', () => {
      expect(svc.calculateBmi(60, 165)).toBe(22.04);
    });

    it('retorna número com 2 casas decimais', () => {
      const result = svc.calculateBmi(70, 170);
      expect(result.toString()).toMatch(/^\d+\.\d{1,2}$/);
    });
  });

  describe('classifyBmi', () => {
    it.each([
      [16, 'Abaixo do peso'],
      [18.4, 'Abaixo do peso'],
      [18.5, 'Peso normal'],
      [22, 'Peso normal'],
      [24.9, 'Peso normal'],
      [25, 'Sobrepeso'],
      [29.9, 'Sobrepeso'],
      [30, 'Obesidade Grau I'],
      [34.9, 'Obesidade Grau I'],
      [35, 'Obesidade Grau II'],
      [39.9, 'Obesidade Grau II'],
      [40, 'Obesidade Grau III'],
      [50, 'Obesidade Grau III'],
    ])('IMC %d → %s', (bmi, expected) => {
      expect(svc.classifyBmi(bmi)).toBe(expected);
    });
  });

  // ── Relação Cintura/Quadril ─────────────────────────��──────────────────────

  describe('calculateWaistHipRatio', () => {
    it('calcula RCQ corretamente', () => {
      expect(svc.calculateWaistHipRatio(90, 100)).toBe(0.9);
    });

    it('retorna 3 casas decimais', () => {
      const result = svc.calculateWaistHipRatio(80, 97);
      expect(result).toBe(0.825);
    });
  });

  // ── Pressão Arterial ──────────────────────────────────────────────────────

  describe('classifyBloodPressure', () => {
    it.each([
      [115, 75, 'Normal'],
      [120, 79, 'Elevada'],
      [125, 78, 'Elevada'],
      [130, 80, 'Hipertensão Estágio 1'],
      [135, 88, 'Hipertensão Estágio 1'],
      [140, 90, 'Hipertensão Estágio 2'],
      [160, 100, 'Hipertensão Estágio 2'],
      [180, 110, 'Crise Hipertensiva'],
      [200, 120, 'Crise Hipertensiva'],
      [170, 121, 'Crise Hipertensiva'],
    ])('S=%d D=%d → %s', (sys, dia, expected) => {
      expect(svc.classifyBloodPressure(sys, dia)).toBe(expected);
    });
  });

  // ��─ Glicemia ──────────────────────────────────────────────────────────────

  describe('classifyBloodGlucose', () => {
    it.each([
      [40, 'Hipoglicemia'],
      [69, 'Hipoglicemia'],
      [70, 'Normal'],
      [99, 'Normal'],
      [100, 'Pré-diabetes'],
      [125, 'Pré-diabetes'],
      [126, 'Diabetes'],
      [300, 'Diabetes'],
    ])('glicemia %d mg/dL → %s', (glucose, expected) => {
      expect(svc.classifyBloodGlucose(glucose)).toBe(expected);
    });
  });
});
