import { PathwayStatus, StepStatus } from '@bio/database';
import { ClinicalPathwayController } from '../controllers/clinical-pathway.controller.js';

const pathway = {
  id: 'pw-1', patientId: 'patient-1', templateId: 'HYPERTENSION_UNCONTROLLED',
  status: PathwayStatus.ACTIVE, currentStep: 0, totalSteps: 5, steps: [],
};

const user = { sub: 'user-1' };

const makeService = (overrides: Record<string, unknown> = {}) => ({
  start: jest.fn().mockResolvedValue(pathway),
  findByPatient: jest.fn().mockResolvedValue([pathway]),
  findById: jest.fn().mockResolvedValue(pathway),
  advanceStep: jest.fn().mockResolvedValue({ ...pathway, currentStep: 1 }),
  complete: jest.fn().mockResolvedValue({ ...pathway, status: PathwayStatus.COMPLETED }),
  cancel: jest.fn().mockResolvedValue({ ...pathway, status: PathwayStatus.CANCELLED }),
  ...overrides,
});

describe('ClinicalPathwayController', () => {
  describe('start', () => {
    it('delegates to service with userId', async () => {
      const service = makeService();
      const controller = new ClinicalPathwayController(service as never);
      const body = { patientId: 'patient-1', templateId: 'HYPERTENSION_UNCONTROLLED' };
      const result = await controller.start(user, body);
      expect(service.start).toHaveBeenCalledWith(body, 'user-1');
      expect(result).toBe(pathway);
    });

    it('passes decisionId and knowledgeId through', async () => {
      const service = makeService();
      const controller = new ClinicalPathwayController(service as never);
      const body = { patientId: 'p-1', templateId: 'DIABETES_HIGH_RISK', decisionId: 'cd-1', knowledgeId: 'kb-1' };
      await controller.start(user, body);
      expect(service.start).toHaveBeenCalledWith(body, 'user-1');
    });
  });

  describe('findByPatient', () => {
    it('returns pathways for a patient', async () => {
      const service = makeService();
      const controller = new ClinicalPathwayController(service as never);
      const result = await controller.findByPatient('patient-1', PathwayStatus.ACTIVE);
      expect(service.findByPatient).toHaveBeenCalledWith('patient-1', PathwayStatus.ACTIVE);
      expect(result).toEqual([pathway]);
    });
  });

  describe('findOne', () => {
    it('returns a pathway by id with steps', async () => {
      const service = makeService();
      const controller = new ClinicalPathwayController(service as never);
      const result = await controller.findOne('pw-1');
      expect(service.findById).toHaveBeenCalledWith('pw-1');
      expect(result).toBe(pathway);
    });
  });

  describe('advanceStep', () => {
    it('delegates step advance with userId', async () => {
      const service = makeService();
      const controller = new ClinicalPathwayController(service as never);
      const result = await controller.advanceStep('pw-1', user, { stepId: 'step-1' });
      expect(service.advanceStep).toHaveBeenCalledWith('pw-1', { stepId: 'step-1' }, 'user-1');
      expect(result.currentStep).toBe(1);
    });

    it('passes custom step status when provided', async () => {
      const service = makeService();
      const controller = new ClinicalPathwayController(service as never);
      await controller.advanceStep('pw-1', user, { stepId: 'step-1', status: StepStatus.SKIPPED });
      expect(service.advanceStep).toHaveBeenCalledWith('pw-1', { stepId: 'step-1', status: StepStatus.SKIPPED }, 'user-1');
    });
  });

  describe('complete', () => {
    it('delegates completion with userId', async () => {
      const service = makeService();
      const controller = new ClinicalPathwayController(service as never);
      const result = await controller.complete('pw-1', user);
      expect(service.complete).toHaveBeenCalledWith('pw-1', 'user-1');
      expect(result.status).toBe(PathwayStatus.COMPLETED);
    });
  });

  describe('cancel', () => {
    it('delegates cancellation with userId', async () => {
      const service = makeService();
      const controller = new ClinicalPathwayController(service as never);
      const result = await controller.cancel('pw-1', user);
      expect(service.cancel).toHaveBeenCalledWith('pw-1', 'user-1');
      expect(result.status).toBe(PathwayStatus.CANCELLED);
    });
  });
});
