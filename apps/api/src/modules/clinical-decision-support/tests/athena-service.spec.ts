import { NotFoundException } from '@nestjs/common';
import { AthenaCdssService } from '../services/athena-cdss.service.js';
import { AthenaCdssProvider } from '../providers/athena-cdss.provider.js';
import type { EvaluatePatientDto } from '../dto/athena-cdss.dto.js';

const makeDto = (patientId = 'svc-p1'): EvaluatePatientDto => ({
  patientId,
  demographics: { age: 58, sex: 'MALE', bmi: 29 },
  conditions: ['diabetes', 'hypertension'],
  biomarkers: [
    { marker: 'hba1c', value: 9.2, unit: '%' },
    { marker: 'bp_systolic', value: 162, unit: 'mmHg' },
  ],
  medications: [
    { name: 'metformin', isCurrent: true },
    { name: 'amlodipine', isCurrent: true },
    { name: 'warfarin', isCurrent: true },
    { name: 'aspirin', isCurrent: true },
  ],
  allergies: ['penicillin'],
  geneticProfile: {
    variants: [{ gene: 'CYP2D6', haplotype: '*4/*4', phenotype: 'POOR_METABOLIZER' }],
  },
});

describe('AthenaCdssService', () => {
  let service: AthenaCdssService;
  let provider: AthenaCdssProvider;

  beforeEach(() => {
    provider = new AthenaCdssProvider();
    service = new AthenaCdssService(provider);
  });

  describe('evaluate()', () => {
    it('returns a DecisionResponseDto with correct patientId', () => {
      const result = service.evaluate(makeDto());
      expect(result.patientId).toBe('svc-p1');
    });

    it('generates a decisionId', () => {
      const result = service.evaluate(makeDto());
      expect(result.decisionId).toMatch(/^cds-/);
    });

    it('produces recommendations', () => {
      const result = service.evaluate(makeDto());
      expect(result.decision.recommendations.length).toBeGreaterThan(0);
    });

    it('produces alerts for the patient', () => {
      const result = service.evaluate(makeDto());
      expect(result.alerts).toBeInstanceOf(Array);
    });

    it('detects drug-drug interaction (warfarin + aspirin)', () => {
      const result = service.evaluate(makeDto());
      const drugAlert = result.alerts.find((a) => a.alertType === 'DRUG_INTERACTION');
      expect(drugAlert).toBeDefined();
    });

    it('includes linked evidence', () => {
      const result = service.evaluate(makeDto());
      expect(result.linkedEvidence.length).toBeGreaterThan(0);
    });

    it('explanation contains reasoning chain', () => {
      const result = service.evaluate(makeDto());
      expect(result.explanation.reasoning).toBeInstanceOf(Array);
      expect(result.explanation.reasoning.length).toBeGreaterThan(0);
    });

    it('summary has all required fields', () => {
      const result = service.evaluate(makeDto());
      expect(result.summary).toHaveProperty('totalRecommendations');
      expect(result.summary).toHaveProperty('criticalAlerts');
      expect(result.summary).toHaveProperty('contraindications');
      expect(result.summary).toHaveProperty('confidence');
      expect(result.summary).toHaveProperty('requiresImmediateAction');
    });

    it('confidence is within [0, 100]', () => {
      const result = service.evaluate(makeDto());
      expect(result.summary.confidence).toBeGreaterThanOrEqual(0);
      expect(result.summary.confidence).toBeLessThanOrEqual(100);
    });

    it('detects penicillin contraindication in allergies', () => {
      const dto = makeDto('allergy-p');
      dto.medications = [{ name: 'amoxicillin-clavulanate (penicillin)', isCurrent: true }];
      const result = service.evaluate(dto);
      expect(result.contraindications.some((c) => c.contraindicationType === 'ALLERGY')).toBe(true);
    });
  });

  describe('getDecision()', () => {
    it('returns decision by id after evaluate', () => {
      const result = service.evaluate(makeDto('get-p1'));
      const fetched = service.getDecision(result.decisionId);
      expect(fetched.patientId).toBe('get-p1');
    });

    it('throws NotFoundException for unknown id', () => {
      expect(() => service.getDecision('unknown-id')).toThrow(NotFoundException);
    });
  });

  describe('getAlerts()', () => {
    it('returns alert summary for patient after evaluate', () => {
      service.evaluate(makeDto('alert-p1'));
      const alerts = service.getAlerts('alert-p1');
      expect(alerts.patientId).toBe('alert-p1');
      expect(typeof alerts.totalAlerts).toBe('number');
      expect(typeof alerts.criticalCount).toBe('number');
    });

    it('returns zero alerts for patient with no evaluations', () => {
      const alerts = service.getAlerts('no-evals');
      expect(alerts.totalAlerts).toBe(0);
    });
  });

  describe('getHistory()', () => {
    it('returns history after multiple evaluations', () => {
      service.evaluate(makeDto('hist-p1'));
      service.evaluate(makeDto('hist-p1'));
      const history = service.getHistory('hist-p1');
      expect(history.length).toBe(2);
    });

    it('throws NotFoundException for patient with no history', () => {
      expect(() => service.getHistory('no-history')).toThrow(NotFoundException);
    });
  });
});
