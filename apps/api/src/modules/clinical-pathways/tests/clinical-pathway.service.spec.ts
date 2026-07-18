import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PathwayStatus, StepStatus } from '@bio/database';
import { ClinicalPathwayService } from '../services/clinical-pathway.service.js';

const step = { id: 'step-1', sequence: 1, status: StepStatus.PENDING, title: 'Avaliação' };
const pathway = {
  id: 'pw-1', patientId: 'patient-1', templateId: 'HYPERTENSION_UNCONTROLLED',
  status: PathwayStatus.ACTIVE, currentStep: 0, totalSteps: 5, steps: [step],
};

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn().mockResolvedValue(pathway),
  findByPatient: jest.fn().mockResolvedValue([pathway]),
  findActive: jest.fn().mockResolvedValue([pathway]),
  findActiveByPatientAndTemplate: jest.fn().mockResolvedValue(null),
  findById: jest.fn().mockResolvedValue(pathway),
  updateStep: jest.fn().mockResolvedValue({ ...step, status: StepStatus.COMPLETED }),
  advanceCurrentStep: jest.fn().mockResolvedValue({ ...pathway, currentStep: 1 }),
  complete: jest.fn().mockResolvedValue({ ...pathway, status: PathwayStatus.COMPLETED }),
  cancel: jest.fn().mockResolvedValue({ ...pathway, status: PathwayStatus.CANCELLED }),
  ...overrides,
});

const makeAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });

describe('ClinicalPathwayService', () => {
  describe('start', () => {
    it('creates a pathway from a known template', async () => {
      const repo = makeRepo();
      const audit = makeAudit();
      const service = new ClinicalPathwayService(repo as never, audit as never);
      const result = await service.start({ patientId: 'patient-1', templateId: 'HYPERTENSION_UNCONTROLLED' }, 'user-1');
      expect(result).toBe(pathway);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ templateId: 'HYPERTENSION_UNCONTROLLED', patientId: 'patient-1' }));
      expect(audit.log).toHaveBeenCalledWith('PATHWAY_STARTED', expect.objectContaining({ userId: 'user-1' }));
    });

    it('passes decisionId and knowledgeId to the pathway', async () => {
      const repo = makeRepo();
      const service = new ClinicalPathwayService(repo as never, makeAudit() as never);
      await service.start({ patientId: 'patient-1', templateId: 'HYPERTENSION_UNCONTROLLED', decisionId: 'cd-1', knowledgeId: 'kb-1' });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ triggerDecisionId: 'cd-1', knowledgeId: 'kb-1' }),
      );
    });

    it('throws NotFoundException for unknown templateId', async () => {
      const service = new ClinicalPathwayService(makeRepo() as never, makeAudit() as never);
      await expect(service.start({ patientId: 'p-1', templateId: 'NONEXISTENT' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when patient has active pathway for same template', async () => {
      const repo = makeRepo({ findActiveByPatientAndTemplate: jest.fn().mockResolvedValue(pathway) });
      const service = new ClinicalPathwayService(repo as never, makeAudit() as never);
      await expect(service.start({ patientId: 'patient-1', templateId: 'HYPERTENSION_UNCONTROLLED' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates steps with correct due dates', async () => {
      const repo = makeRepo();
      const service = new ClinicalPathwayService(repo as never, makeAudit() as never);
      await service.start({ patientId: 'patient-1', templateId: 'HYPERTENSION_UNCONTROLLED' });
      const call = (repo.create as jest.Mock).mock.calls[0][0];
      expect(call.steps).toHaveLength(5);
      expect(call.steps[0].dueDate).toBeInstanceOf(Date);
      const day30 = call.steps[4].dueDate as Date;
      const diffDays = Math.round((day30.getTime() - call.steps[0].dueDate.getTime()) / 86_400_000);
      expect(diffDays).toBe(30);
    });

    it('all 5 templates can be started (no unknown templateId)', async () => {
      const repo = makeRepo();
      const service = new ClinicalPathwayService(repo as never, makeAudit() as never);
      const templates = ['HYPERTENSION_UNCONTROLLED', 'DIABETES_HIGH_RISK', 'SEVERE_OBESITY', 'DYSLIPIDEMIA_SIGNIFICANT', 'METABOLIC_SYNDROME'];
      for (const id of templates) {
        await expect(service.start({ patientId: 'p-1', templateId: id })).resolves.toBeDefined();
      }
    });
  });

  describe('findByPatient', () => {
    it('returns pathways for a patient', async () => {
      const service = new ClinicalPathwayService(makeRepo() as never, makeAudit() as never);
      const result = await service.findByPatient('patient-1');
      expect(result).toEqual([pathway]);
    });
  });

  describe('findById', () => {
    it('returns pathway with steps', async () => {
      const service = new ClinicalPathwayService(makeRepo() as never, makeAudit() as never);
      const result = await service.findById('pw-1');
      expect(result).toBe(pathway);
    });

    it('throws NotFoundException when not found', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new ClinicalPathwayService(repo as never, makeAudit() as never);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('advanceStep', () => {
    it('marks step as completed and advances currentStep', async () => {
      const multiStepPathway = {
        ...pathway,
        totalSteps: 5,
        steps: [
          { id: 'step-1', sequence: 1, status: StepStatus.PENDING },
          { id: 'step-2', sequence: 2, status: StepStatus.PENDING },
        ],
      };
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(multiStepPathway) });
      const audit = makeAudit();
      const service = new ClinicalPathwayService(repo as never, audit as never);
      await service.advanceStep('pw-1', { stepId: 'step-1' }, 'user-1');
      expect(repo.updateStep).toHaveBeenCalledWith('step-1', StepStatus.COMPLETED, expect.any(Date));
      expect(repo.advanceCurrentStep).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith('PATHWAY_STEP_ADVANCED', expect.anything());
    });

    it('auto-completes pathway when last step is advanced', async () => {
      const lastStepPathway = { ...pathway, steps: [{ id: 'step-1', sequence: 1, status: StepStatus.PENDING }], totalSteps: 1 };
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(lastStepPathway) });
      const audit = makeAudit();
      const service = new ClinicalPathwayService(repo as never, audit as never);
      await service.advanceStep('pw-1', { stepId: 'step-1' });
      expect(repo.complete).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith('PATHWAY_COMPLETED', expect.anything());
    });

    it('throws NotFoundException when pathway does not exist', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const service = new ClinicalPathwayService(repo as never, makeAudit() as never);
      await expect(service.advanceStep('missing', { stepId: 'step-1' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when pathway is not ACTIVE', async () => {
      const cancelledPathway = { ...pathway, status: PathwayStatus.CANCELLED };
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(cancelledPathway) });
      const service = new ClinicalPathwayService(repo as never, makeAudit() as never);
      await expect(service.advanceStep('pw-1', { stepId: 'step-1' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when stepId not in pathway', async () => {
      const service = new ClinicalPathwayService(makeRepo() as never, makeAudit() as never);
      await expect(service.advanceStep('pw-1', { stepId: 'nonexistent-step' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('complete', () => {
    it('completes the pathway and logs audit', async () => {
      const repo = makeRepo();
      const audit = makeAudit();
      const service = new ClinicalPathwayService(repo as never, audit as never);
      const result = await service.complete('pw-1', 'user-1');
      expect(result.status).toBe(PathwayStatus.COMPLETED);
      expect(audit.log).toHaveBeenCalledWith('PATHWAY_COMPLETED', expect.objectContaining({ userId: 'user-1' }));
    });

    it('throws BadRequestException when pathway is already completed', async () => {
      const completedPathway = { ...pathway, status: PathwayStatus.COMPLETED };
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(completedPathway) });
      const service = new ClinicalPathwayService(repo as never, makeAudit() as never);
      await expect(service.complete('pw-1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('cancels the pathway and logs audit', async () => {
      const repo = makeRepo();
      const audit = makeAudit();
      const service = new ClinicalPathwayService(repo as never, audit as never);
      const result = await service.cancel('pw-1', 'user-1');
      expect(result.status).toBe(PathwayStatus.CANCELLED);
      expect(audit.log).toHaveBeenCalledWith('PATHWAY_CANCELLED', expect.objectContaining({ userId: 'user-1' }));
    });

    it('throws BadRequestException when already cancelled', async () => {
      const cancelledPathway = { ...pathway, status: PathwayStatus.CANCELLED };
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(cancelledPathway) });
      const service = new ClinicalPathwayService(repo as never, makeAudit() as never);
      await expect(service.cancel('pw-1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
