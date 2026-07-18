import { DecisionPriority, DecisionStatus, DecisionType, EvidenceLevel } from '@bio/database';
import { ClinicalDecisionSupportController } from '../controllers/clinical-decision-support.controller.js';

const decision = {
  id: 'cd-1',
  patientId: 'patient-1',
  ruleId: 'HYPERTENSION_UNCONTROLLED',
  decisionType: DecisionType.ALERT,
  priority: DecisionPriority.CRITICAL,
  status: DecisionStatus.OPEN,
  title: 'Hipertensão',
  evidenceLevel: EvidenceLevel.A,
};

const user = { sub: 'user-1' };

const makeService = (overrides: Record<string, unknown> = {}) => ({
  evaluate: jest.fn().mockResolvedValue({ evaluated: 1, generated: 1, decisions: [decision] }),
  findByPatient: jest.fn().mockResolvedValue([decision]),
  findById: jest.fn().mockResolvedValue(decision),
  updateStatus: jest.fn().mockResolvedValue({ ...decision, status: DecisionStatus.ACKNOWLEDGED }),
  ...overrides,
});

describe('ClinicalDecisionSupportController', () => {
  describe('evaluate', () => {
    it('delegates to service with userId', async () => {
      const service = makeService();
      const controller = new ClinicalDecisionSupportController(service as never);
      const body = { patientId: 'patient-1', triggerData: { bp_systolic: 170 } };
      const result = await controller.evaluate(user, body);
      expect(service.evaluate).toHaveBeenCalledWith('patient-1', { bp_systolic: 170 }, 'user-1', undefined);
      expect(result.generated).toBe(1);
    });

    it('passes tenantId when provided', async () => {
      const service = makeService();
      const controller = new ClinicalDecisionSupportController(service as never);
      await controller.evaluate(user, { patientId: 'p-1', triggerData: {}, tenantId: 'tenant-1' });
      expect(service.evaluate).toHaveBeenCalledWith('p-1', {}, 'user-1', 'tenant-1');
    });
  });

  describe('findByPatient', () => {
    it('returns decisions for a patient', async () => {
      const service = makeService();
      const controller = new ClinicalDecisionSupportController(service as never);
      const result = await controller.findByPatient('patient-1', DecisionStatus.OPEN);
      expect(service.findByPatient).toHaveBeenCalledWith('patient-1', DecisionStatus.OPEN);
      expect(result).toEqual([decision]);
    });
  });

  describe('findOne', () => {
    it('returns decision by id', async () => {
      const service = makeService();
      const controller = new ClinicalDecisionSupportController(service as never);
      const result = await controller.findOne('cd-1');
      expect(service.findById).toHaveBeenCalledWith('cd-1');
      expect(result).toBe(decision);
    });
  });

  describe('updateStatus', () => {
    it('delegates status update with userId', async () => {
      const service = makeService();
      const controller = new ClinicalDecisionSupportController(service as never);
      const result = await controller.updateStatus('cd-1', user, { status: DecisionStatus.ACKNOWLEDGED });
      expect(service.updateStatus).toHaveBeenCalledWith('cd-1', DecisionStatus.ACKNOWLEDGED, 'user-1');
      expect(result.status).toBe(DecisionStatus.ACKNOWLEDGED);
    });
  });
});
