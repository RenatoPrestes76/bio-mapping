import { PathwayStatus, StepActionType, StepStatus } from '@bio/database';
import { PrismaClinicalPathwayRepository } from '../repositories/prisma-clinical-pathway.repository.js';

const step = { id: 'step-1', sequence: 1, title: 'Avaliação', status: StepStatus.PENDING };
const pathway = {
  id: 'pw-1', patientId: 'patient-1', templateId: 'HYPERTENSION_UNCONTROLLED',
  status: PathwayStatus.ACTIVE, currentStep: 0, totalSteps: 5, steps: [step],
};

const makePrisma = (overrides: Record<string, unknown> = {}) => ({
  clinicalPathway: {
    create: jest.fn().mockResolvedValue(pathway),
    findMany: jest.fn().mockResolvedValue([pathway]),
    findFirst: jest.fn().mockResolvedValue(pathway),
    findUnique: jest.fn().mockResolvedValue(pathway),
    update: jest.fn().mockResolvedValue({ ...pathway, status: PathwayStatus.COMPLETED }),
    ...overrides,
  },
  clinicalPathwayStep: {
    update: jest.fn().mockResolvedValue({ ...step, status: StepStatus.COMPLETED }),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
});

describe('PrismaClinicalPathwayRepository', () => {
  describe('create', () => {
    it('creates a pathway with steps via nested create', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalPathwayRepository(prisma as never);
      const result = await repo.create({
        patientId: 'patient-1', name: 'Jornada Hipertensão', templateId: 'HYPERTENSION_UNCONTROLLED',
        totalSteps: 1, steps: [{ sequence: 1, title: 'Assessment', description: 'desc', actionType: 'ASSESSMENT' }],
      });
      expect(result).toBe(pathway);
      expect(prisma.clinicalPathway.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patientId: 'patient-1' }), include: expect.any(Object) }),
      );
    });
  });

  describe('findByPatient', () => {
    it('queries by patientId', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalPathwayRepository(prisma as never);
      const result = await repo.findByPatient('patient-1');
      expect(prisma.clinicalPathway.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { patientId: 'patient-1' } }),
      );
      expect(result).toEqual([pathway]);
    });

    it('adds status filter when provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalPathwayRepository(prisma as never);
      await repo.findByPatient('patient-1', PathwayStatus.ACTIVE);
      expect(prisma.clinicalPathway.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { patientId: 'patient-1', status: PathwayStatus.ACTIVE } }),
      );
    });
  });

  describe('findActive', () => {
    it('filters by ACTIVE status', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalPathwayRepository(prisma as never);
      await repo.findActive();
      expect(prisma.clinicalPathway.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: PathwayStatus.ACTIVE } }),
      );
    });

    it('adds tenantId when provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalPathwayRepository(prisma as never);
      await repo.findActive('tenant-1');
      expect(prisma.clinicalPathway.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: PathwayStatus.ACTIVE, tenantId: 'tenant-1' } }),
      );
    });
  });

  describe('findActiveByPatientAndTemplate', () => {
    it('finds existing active pathway for same template', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalPathwayRepository(prisma as never);
      const result = await repo.findActiveByPatientAndTemplate('patient-1', 'HYPERTENSION_UNCONTROLLED');
      expect(result).toBe(pathway);
    });

    it('returns null when not found', async () => {
      const prisma = makePrisma({ findFirst: jest.fn().mockResolvedValue(null) });
      const repo = new PrismaClinicalPathwayRepository(prisma as never);
      const result = await repo.findActiveByPatientAndTemplate('patient-1', 'UNKNOWN');
      expect(result).toBeNull();
    });
  });

  describe('updateStep', () => {
    it('marks step as completed with completedAt', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalPathwayRepository(prisma as never);
      const now = new Date();
      await repo.updateStep('step-1', StepStatus.COMPLETED, now);
      expect(prisma.clinicalPathwayStep.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'step-1' }, data: expect.objectContaining({ status: StepStatus.COMPLETED }) }),
      );
    });
  });

  describe('complete', () => {
    it('updates remaining PENDING steps to SKIPPED and pathway to COMPLETED', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalPathwayRepository(prisma as never);
      await repo.complete('pw-1', new Date(), 'user-1');
      expect(prisma.clinicalPathwayStep.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { pathwayId: 'pw-1', status: StepStatus.PENDING } }),
      );
      expect(prisma.clinicalPathway.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: PathwayStatus.COMPLETED }) }),
      );
    });
  });

  describe('cancel', () => {
    it('cancels in-progress steps and marks pathway as CANCELLED', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalPathwayRepository(prisma as never);
      await repo.cancel('pw-1', 'user-1');
      expect(prisma.clinicalPathwayStep.updateMany).toHaveBeenCalled();
      expect(prisma.clinicalPathway.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: PathwayStatus.CANCELLED }) }),
      );
    });
  });
});
