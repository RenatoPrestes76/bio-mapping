import { NotFoundException } from '@nestjs/common';
import { DecisionPriority, DecisionStatus, DecisionType, EvidenceLevel } from '@bio/database';
import { ClinicalDecisionSupportService } from '../services/clinical-decision-support.service.js';

const decision = {
  id: 'cd-1',
  patientId: 'patient-1',
  ruleId: 'HYPERTENSION_UNCONTROLLED',
  decisionType: DecisionType.ALERT,
  priority: DecisionPriority.CRITICAL,
  status: DecisionStatus.OPEN,
  title: 'Hipertensão Não Controlada',
  evidenceLevel: EvidenceLevel.A,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn().mockResolvedValue(decision),
  findByPatient: jest.fn().mockResolvedValue([decision]),
  findOpen: jest.fn().mockResolvedValue([decision]),
  findOpenByPatientAndRule: jest.fn().mockResolvedValue(null),
  findById: jest.fn().mockResolvedValue(decision),
  updateStatus: jest.fn().mockResolvedValue({ ...decision, status: DecisionStatus.ACKNOWLEDGED }),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeKnowledgeService = () => ({
  findPublished: jest.fn().mockResolvedValue([
    { id: 'kb-1', clinicalCode: 'I10', title: 'Hipertensão' },
    { id: 'kb-2', clinicalCode: 'E11', title: 'Diabetes' },
    { id: 'kb-3', clinicalCode: 'E66', title: 'Obesidade' },
    { id: 'kb-4', clinicalCode: 'E78', title: 'Dislipidemia' },
    { id: 'kb-5', clinicalCode: 'E88.8', title: 'Síndrome Metabólica' },
  ]),
});

const makeAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });

describe('ClinicalDecisionSupportService', () => {
  describe('evaluate', () => {
    it('generates a decision when hypertension rule triggers', async () => {
      const repo = makeRepo();
      const service = new ClinicalDecisionSupportService(repo as never, makeKnowledgeService() as never, makeAudit() as never);
      const result = await service.evaluate('patient-1', { bp_systolic: 170, bp_diastolic: 100 }, 'user-1');
      expect(result.generated).toBe(1);
      expect(result.decisions).toHaveLength(1);
      expect(repo.create).toHaveBeenCalledTimes(1);
    });

    it('does not generate duplicate if open decision already exists', async () => {
      const repo = makeRepo({ findOpenByPatientAndRule: jest.fn().mockResolvedValue(decision) });
      const service = new ClinicalDecisionSupportService(repo as never, makeKnowledgeService() as never, makeAudit() as never);
      const result = await service.evaluate('patient-1', { bp_systolic: 170 }, 'user-1');
      expect(result.generated).toBe(0);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('skips rules that do not support the trigger data', async () => {
      const repo = makeRepo();
      const service = new ClinicalDecisionSupportService(repo as never, makeKnowledgeService() as never, makeAudit() as never);
      // Only BMI present — only SevereObesityRule supports it; but BMI=28 is below threshold
      const result = await service.evaluate('patient-1', { bmi: 28 }, 'user-1');
      expect(result.generated).toBe(0);
    });

    it('can trigger multiple rules simultaneously', async () => {
      const repo = makeRepo();
      const audit = makeAudit();
      const service = new ClinicalDecisionSupportService(repo as never, makeKnowledgeService() as never, audit as never);
      const result = await service.evaluate('patient-1', {
        bp_systolic: 170,
        glucose: 200,
        bmi: 42,
        ldl: 200,
        waist: 110, triglycerides: 160, hdl: 35, bp_diastolic: 105,
      });
      expect(result.generated).toBeGreaterThan(1);
      expect(audit.log).toHaveBeenCalledWith('DECISION_CREATED', expect.anything());
    });

    it('reports evaluated count correctly', async () => {
      const repo = makeRepo();
      const service = new ClinicalDecisionSupportService(repo as never, makeKnowledgeService() as never, makeAudit() as never);
      const result = await service.evaluate('patient-1', { bp_systolic: 170, bp_diastolic: 100 });
      expect(result.evaluated).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findByPatient', () => {
    it('returns decisions for a patient', async () => {
      const service = new ClinicalDecisionSupportService(makeRepo() as never, makeKnowledgeService() as never, makeAudit() as never);
      const result = await service.findByPatient('patient-1');
      expect(result).toEqual([decision]);
    });
  });

  describe('findById', () => {
    it('returns a decision by id', async () => {
      const service = new ClinicalDecisionSupportService(makeRepo() as never, makeKnowledgeService() as never, makeAudit() as never);
      const result = await service.findById('cd-1');
      expect(result).toBe(decision);
    });

    it('throws NotFoundException when not found', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new ClinicalDecisionSupportService(repo as never, makeKnowledgeService() as never, makeAudit() as never);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('updates status and logs audit', async () => {
      const repo = makeRepo();
      const audit = makeAudit();
      const service = new ClinicalDecisionSupportService(repo as never, makeKnowledgeService() as never, audit as never);
      const result = await service.updateStatus('cd-1', DecisionStatus.ACKNOWLEDGED, 'user-1');
      expect(result.status).toBe(DecisionStatus.ACKNOWLEDGED);
      expect(audit.log).toHaveBeenCalledWith('DECISION_STATUS_UPDATED', expect.objectContaining({ userId: 'user-1' }));
    });

    it('throws NotFoundException when decision does not exist', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new ClinicalDecisionSupportService(repo as never, makeKnowledgeService() as never, makeAudit() as never);
      await expect(service.updateStatus('missing', DecisionStatus.RESOLVED)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
