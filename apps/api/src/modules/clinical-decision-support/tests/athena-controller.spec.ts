import { NotFoundException } from '@nestjs/common';
import { AthenaCdssController } from '../athena-cdss.controller.js';
import { AthenaCdssService } from '../services/athena-cdss.service.js';
import { AthenaCdssProvider } from '../providers/athena-cdss.provider.js';
import type { EvaluatePatientDto } from '../dto/athena-cdss.dto.js';

const mockUser = { sub: 'user-1' };

const makeDto = (patientId = 'ctrl-p1'): EvaluatePatientDto => ({
  patientId,
  demographics: { age: 65, sex: 'FEMALE', bmi: 30 },
  conditions: ['diabetes', 'ckd'],
  biomarkers: [
    { marker: 'hba1c', value: 8.0, unit: '%' },
    { marker: 'egfr', value: 42, unit: 'mL/min' },
    { marker: 'ldl', value: 175, unit: 'mg/dL' },
  ],
  medications: [
    { name: 'metformin', isCurrent: true },
    { name: 'atorvastatin', isCurrent: true },
    { name: 'ibuprofen', isCurrent: true },
  ],
  allergies: ['sulfa'],
});

describe('AthenaCdssController', () => {
  let controller: AthenaCdssController;
  let service: AthenaCdssService;

  beforeEach(() => {
    const provider = new AthenaCdssProvider();
    service = new AthenaCdssService(provider);
    controller = new AthenaCdssController(service);
  });

  describe('POST /athena-cdss/evaluate', () => {
    it('returns a DecisionResponseDto', () => {
      const result = controller.evaluate(makeDto(), mockUser);
      expect(result.patientId).toBe('ctrl-p1');
      expect(result.decisionId).toBeDefined();
    });

    it('detects CKD + ibuprofen contraindication', () => {
      const result = controller.evaluate(makeDto(), mockUser);
      expect(result.contraindications.some((c) => c.contraindicationType === 'DISEASE_RELATED')).toBe(true);
    });

    it('generates alerts for elevated HbA1c', () => {
      const result = controller.evaluate(makeDto(), mockUser);
      expect(result.alerts.length).toBeGreaterThan(0);
    });

    it('has linked evidence', () => {
      const result = controller.evaluate(makeDto(), mockUser);
      expect(result.linkedEvidence.length).toBeGreaterThan(0);
    });

    it('decision has recommendations', () => {
      const result = controller.evaluate(makeDto(), mockUser);
      expect(result.decision.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('GET /athena-cdss/decision/:id', () => {
    it('retrieves decision by id', () => {
      const created = controller.evaluate(makeDto('d-p1'), mockUser);
      const fetched = controller.getDecision(created.decisionId, mockUser);
      expect(fetched.patientId).toBe('d-p1');
    });

    it('throws 404 for unknown decision id', () => {
      expect(() => controller.getDecision('nonexistent', mockUser)).toThrow(NotFoundException);
    });
  });

  describe('GET /athena-cdss/alerts/:patientId', () => {
    it('returns alert summary after evaluate', () => {
      controller.evaluate(makeDto('alert-ctrl-p'), mockUser);
      const alertSummary = controller.getAlerts('alert-ctrl-p', mockUser);
      expect(alertSummary.patientId).toBe('alert-ctrl-p');
      expect(typeof alertSummary.totalAlerts).toBe('number');
    });

    it('returns zero alerts for patient with no evaluation', () => {
      const summary = controller.getAlerts('no-alerts-patient', mockUser);
      expect(summary.totalAlerts).toBe(0);
    });
  });

  describe('GET /athena-cdss/history/:patientId', () => {
    it('returns decision history', () => {
      controller.evaluate(makeDto('hist-ctrl'), mockUser);
      controller.evaluate(makeDto('hist-ctrl'), mockUser);
      const history = controller.getHistory('hist-ctrl', mockUser);
      expect(history.length).toBe(2);
    });

    it('throws 404 for patient with no history', () => {
      expect(() => controller.getHistory('no-history-ctrl', mockUser)).toThrow(NotFoundException);
    });
  });
});
