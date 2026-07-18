import { DecisionStatus, DecisionType, DecisionPriority, EvidenceLevel } from '@bio/database';
import { PrismaClinicalDecisionRepository } from '../repositories/prisma-clinical-decision.repository.js';

const decision = {
  id: 'cd-1',
  patientId: 'patient-1',
  ruleId: 'HYPERTENSION_UNCONTROLLED',
  decisionType: DecisionType.ALERT,
  priority: DecisionPriority.CRITICAL,
  status: DecisionStatus.OPEN,
  title: 'Hipertensão Não Controlada',
  evidenceLevel: EvidenceLevel.A,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makePrisma = (overrides: Record<string, unknown> = {}) => ({
  clinicalDecision: {
    create: jest.fn().mockResolvedValue(decision),
    findMany: jest.fn().mockResolvedValue([decision]),
    findFirst: jest.fn().mockResolvedValue(decision),
    findUnique: jest.fn().mockResolvedValue(decision),
    update: jest.fn().mockResolvedValue({ ...decision, status: DecisionStatus.ACKNOWLEDGED }),
    delete: jest.fn().mockResolvedValue({}),
    ...overrides,
  },
});

describe('PrismaClinicalDecisionRepository', () => {
  describe('create', () => {
    it('persists a new clinical decision', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalDecisionRepository(prisma as never);
      const result = await repo.create({
        patientId: 'patient-1',
        ruleId: 'HYPERTENSION_UNCONTROLLED',
        decisionType: 'ALERT',
        priority: 'CRITICAL',
        title: 'Hipertensão',
        evidenceLevel: 'A',
      });
      expect(result).toBe(decision);
      expect(prisma.clinicalDecision.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patientId: 'patient-1', ruleId: 'HYPERTENSION_UNCONTROLLED' }) }),
      );
    });
  });

  describe('findByPatient', () => {
    it('returns all decisions for a patient', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalDecisionRepository(prisma as never);
      const result = await repo.findByPatient('patient-1');
      expect(result).toEqual([decision]);
      expect(prisma.clinicalDecision.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { patientId: 'patient-1' } }),
      );
    });

    it('adds status filter when provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalDecisionRepository(prisma as never);
      await repo.findByPatient('patient-1', DecisionStatus.OPEN);
      expect(prisma.clinicalDecision.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { patientId: 'patient-1', status: DecisionStatus.OPEN } }),
      );
    });
  });

  describe('findOpen', () => {
    it('returns open decisions globally', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalDecisionRepository(prisma as never);
      await repo.findOpen();
      expect(prisma.clinicalDecision.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: DecisionStatus.OPEN } }),
      );
    });

    it('adds tenantId filter when provided', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalDecisionRepository(prisma as never);
      await repo.findOpen('tenant-1');
      expect(prisma.clinicalDecision.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: DecisionStatus.OPEN, tenantId: 'tenant-1' } }),
      );
    });
  });

  describe('findOpenByPatientAndRule', () => {
    it('returns existing open decision', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalDecisionRepository(prisma as never);
      const result = await repo.findOpenByPatientAndRule('patient-1', 'HYPERTENSION_UNCONTROLLED');
      expect(result).toBe(decision);
    });

    it('returns null when no open decision exists', async () => {
      const prisma = makePrisma({ findFirst: jest.fn().mockResolvedValue(null) });
      const repo = new PrismaClinicalDecisionRepository(prisma as never);
      const result = await repo.findOpenByPatientAndRule('patient-1', 'SOME_RULE');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns decision by id', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalDecisionRepository(prisma as never);
      const result = await repo.findById('cd-1');
      expect(result).toBe(decision);
    });
  });

  describe('updateStatus', () => {
    it('updates decision status', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalDecisionRepository(prisma as never);
      const result = await repo.updateStatus('cd-1', DecisionStatus.ACKNOWLEDGED, 'user-1');
      expect(result.status).toBe(DecisionStatus.ACKNOWLEDGED);
      expect(prisma.clinicalDecision.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cd-1' }, data: expect.objectContaining({ status: DecisionStatus.ACKNOWLEDGED }) }),
      );
    });
  });

  describe('delete', () => {
    it('deletes decision by id', async () => {
      const prisma = makePrisma();
      const repo = new PrismaClinicalDecisionRepository(prisma as never);
      await repo.delete('cd-1');
      expect(prisma.clinicalDecision.delete).toHaveBeenCalledWith({ where: { id: 'cd-1' } });
    });
  });
});
