import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CdsService } from '../services/cds.service.js';
import type { CdsRepository } from '../repositories/cds.repository.js';
import type { AlertManagerService } from '../services/alert-manager.service.js';
import type { AuditLogService } from '../../../../common/audit/audit-log.service.js';

const makeRepo = () => ({
  createEvaluation: jest.fn(),
  findEvaluationById: jest.fn(),
  findHistory: jest.fn(),
  updateEvaluation: jest.fn(),
  findActiveRules: jest.fn(),
  createRule: jest.fn(),
  updateRule: jest.fn(),
  createAlert: jest.fn(),
  findAlertById: jest.fn(),
  findAlertsByPatient: jest.fn(),
  markAlertRead: jest.fn(),
  createFeedback: jest.fn(),
  findFeedbackByEvaluation: jest.fn(),
});

const makeAlertManager = () => ({
  shouldAlert: jest.fn(),
  createAlert: jest.fn(),
  getAlerts: jest.fn(),
  markRead: jest.fn(),
});

const makeAudit = () => ({ log: jest.fn() });

const makePrisma = () => ({
  patient: { findFirst: jest.fn() },
  professional: { findFirst: jest.fn() },
  membership: { findFirst: jest.fn() },
});

const ADMIN = { sub: 'admin-1', role: 'ADMIN' };
const PATIENT_OWNER = { sub: 'user-1', role: 'PATIENT' };
const PATIENT_OTHER = { sub: 'user-2', role: 'PATIENT' };
const PROF = { sub: 'prof-1', role: 'PROFESSIONAL' };
const OTHER_PROF = { sub: 'prof-2', role: 'PROFESSIONAL' };

const PATIENT_P1 = { id: 'p1', userId: 'user-1', primaryProfessionalId: 'prof-1', deletedAt: null };

const SAVED_EVAL = {
  id: 'eval-1',
  patientId: 'p1',
  priority: 'HIGH' as const,
  confidence: 0.82,
  recommendation: 'Avaliação médica.',
  reasons: ['Suspeita de Diabetes Tipo 2'],
  evidenceLevel: 'A' as const,
  requiresMedicalReview: true,
  variables: { hba1c: 7.0, bmi: 32 },
  weights: {},
  rulesTriggered: [],
  modelsUsed: ['rule-engine'],
  inputData: { patientId: 'p1', variables: { hba1c: 7.0, bmi: 32 }, examCount: 3, biomarkerCount: 2, hasLongitudinalHistory: false },
  processingTimeMs: 50,
  version: '1.0',
  createdAt: new Date(),
  updatedAt: new Date(),
  evaluatedBy: 'u1',
  tenantId: null,
  references: null,
};

describe('CdsService', () => {
  let service: CdsService;
  let repo: ReturnType<typeof makeRepo>;
  let alertManager: ReturnType<typeof makeAlertManager>;
  let audit: ReturnType<typeof makeAudit>;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    repo = makeRepo();
    alertManager = makeAlertManager();
    audit = makeAudit();
    prisma = makePrisma();

    (prisma.patient.findFirst as jest.Mock).mockImplementation((args: any) =>
      Promise.resolve(args.where.id === 'p1' ? PATIENT_P1 : null),
    );
    (prisma.professional.findFirst as jest.Mock).mockImplementation((args: any) =>
      Promise.resolve(args.where.userId === 'prof-1' ? { id: 'prof-1' } : args.where.userId === 'prof-2' ? { id: 'prof-2' } : null),
    );
    (prisma.membership.findFirst as jest.Mock).mockResolvedValue(null);

    service = new CdsService(
      repo as unknown as CdsRepository,
      alertManager as unknown as AlertManagerService,
      audit as unknown as AuditLogService,
      prisma as never,
    );
  });

  describe('evaluate', () => {
    beforeEach(() => {
      (repo.findActiveRules as jest.Mock).mockResolvedValue([]);
      (repo.createEvaluation as jest.Mock).mockResolvedValue(SAVED_EVAL);
      (alertManager.shouldAlert as jest.Mock).mockReturnValue(true);
      (alertManager.createAlert as jest.Mock).mockResolvedValue({ id: 'alert-1' });
      (audit.log as jest.Mock).mockResolvedValue(undefined);
    });

    it('creates evaluation and returns it', async () => {
      const result = await service.evaluate({
        patientId: 'p1',
        variables: { hba1c: 7.0, bmi: 32 },
        examCount: 3,
        biomarkerCount: 2,
      } as never, ADMIN);
      expect(result).toEqual(SAVED_EVAL);
      expect(repo.createEvaluation).toHaveBeenCalled();
    });

    it('applies DEFAULT_RULES when no DB rules', async () => {
      await service.evaluate({ patientId: 'p1', variables: { hba1c: 7.0, bmi: 32 } } as never, ADMIN);
      const callArgs = (repo.createEvaluation as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      expect((callArgs.rulesTriggered as unknown[]).length).toBeGreaterThan(0);
    });

    it('generates alert when priority requires it', async () => {
      await service.evaluate({ patientId: 'p1', variables: { hba1c: 7.0, bmi: 32 } } as never, ADMIN);
      expect(alertManager.createAlert).toHaveBeenCalled();
    });

    it('does not generate alert for LOW priority', async () => {
      (alertManager.shouldAlert as jest.Mock).mockReturnValue(false);
      await service.evaluate({ patientId: 'p1', variables: {} } as never, ADMIN);
      expect(alertManager.createAlert).not.toHaveBeenCalled();
    });

    it('logs CDS_EVALUATED audit action', async () => {
      await service.evaluate({ patientId: 'p1', variables: {} } as never, ADMIN);
      expect(audit.log).toHaveBeenCalledWith('CDS_EVALUATED', expect.any(Object));
    });

    it('merges DB rules with built-in rules', async () => {
      const dbRule = {
        id: 'db-001', name: 'Custom Rule',
        conditions: [{ variable: 'glucose', operator: 'gte', value: 200 }],
        conjunction: 'AND', priority: 'HIGH', recommendation: 'Custom.', evidenceLevel: 'B', active: true,
      };
      (repo.findActiveRules as jest.Mock).mockResolvedValue([dbRule]);
      await service.evaluate({ patientId: 'p1', variables: { glucose: 250 } } as never, ADMIN);
      const callArgs = (repo.createEvaluation as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      const triggered = callArgs.rulesTriggered as Array<{ id: string }>;
      expect(triggered.some((r) => r.id === 'db-001')).toBe(true);
    });

    it('sets requiresMedicalReview=true for HIGH priority result', async () => {
      (repo.createEvaluation as jest.Mock).mockResolvedValue({ ...SAVED_EVAL, priority: 'HIGH', requiresMedicalReview: true });
      const result = await service.evaluate({ patientId: 'p1', variables: { hba1c: 7.0, bmi: 32 } } as never, ADMIN);
      expect(result.requiresMedicalReview).toBe(true);
    });

    it('PATIENT dono do registro pode avaliar a si mesmo', async () => {
      await expect(service.evaluate({ patientId: 'p1', variables: {} } as never, PATIENT_OWNER)).resolves.toBeDefined();
    });

    it('PROFESSIONAL vinculado ao paciente pode avaliar', async () => {
      await expect(service.evaluate({ patientId: 'p1', variables: {} } as never, PROF)).resolves.toBeDefined();
    });

    it('SECURITY (IDOR): PATIENT não pode avaliar em nome de outro paciente', async () => {
      await expect(service.evaluate({ patientId: 'p1', variables: {} } as never, PATIENT_OTHER)).rejects.toThrow(ForbiddenException);
      expect(repo.createEvaluation).not.toHaveBeenCalled();
    });

    it('SECURITY (IDOR): PROFESSIONAL sem vínculo e sem membership não pode avaliar', async () => {
      await expect(service.evaluate({ patientId: 'p1', variables: {} } as never, OTHER_PROF)).rejects.toThrow(ForbiddenException);
      expect(repo.createEvaluation).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns evaluation when found (ADMIN)', async () => {
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(SAVED_EVAL);
      const result = await service.findById('eval-1', ADMIN);
      expect(result).toEqual(SAVED_EVAL);
    });

    it('throws NotFoundException when not found', async () => {
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(null);
      await expect(service.findById('bad', ADMIN)).rejects.toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): PATIENT não pode ler evaluation de outro paciente', async () => {
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(SAVED_EVAL);
      await expect(service.findById('eval-1', PATIENT_OTHER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findHistory', () => {
    it('delegates to repository for ADMIN', async () => {
      (repo.findHistory as jest.Mock).mockResolvedValue([SAVED_EVAL]);
      const result = await service.findHistory('p1', ADMIN, 10);
      expect(result).toHaveLength(1);
      expect(repo.findHistory).toHaveBeenCalledWith('p1', 10);
    });

    it('SECURITY (IDOR): PATIENT não pode ler histórico de outro paciente', async () => {
      await expect(service.findHistory('p1', PATIENT_OTHER)).rejects.toThrow(ForbiddenException);
      expect(repo.findHistory).not.toHaveBeenCalled();
    });
  });

  describe('recalculate', () => {
    it('re-evaluates using stored inputData', async () => {
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(SAVED_EVAL);
      (repo.findActiveRules as jest.Mock).mockResolvedValue([]);
      (repo.createEvaluation as jest.Mock).mockResolvedValue(SAVED_EVAL);
      (alertManager.shouldAlert as jest.Mock).mockReturnValue(false);
      (audit.log as jest.Mock).mockResolvedValue(undefined);

      const result = await service.recalculate('eval-1', ADMIN);
      expect(result).toBeDefined();
      expect(audit.log).toHaveBeenCalledWith('CDS_RECALCULATED', expect.any(Object));
    });

    it('throws when evaluation not found', async () => {
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(null);
      await expect(service.recalculate('bad', ADMIN)).rejects.toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): PATIENT não pode recalcular evaluation de outro paciente', async () => {
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(SAVED_EVAL);
      await expect(service.recalculate('eval-1', PATIENT_OTHER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addFeedback', () => {
    it('creates feedback record', async () => {
      const feedback = { id: 'f1', evaluationId: 'eval-1', userId: 'admin-1', rating: 4, createdAt: new Date() };
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(SAVED_EVAL);
      (repo.createFeedback as jest.Mock).mockResolvedValue(feedback);
      (audit.log as jest.Mock).mockResolvedValue(undefined);

      const result = await service.addFeedback('eval-1', { rating: 4, comment: 'Good' } as never, ADMIN);
      expect(result).toEqual(feedback);
      expect(audit.log).toHaveBeenCalledWith('CDS_FEEDBACK_ADDED', expect.any(Object));
    });

    it('SECURITY (IDOR): PATIENT não pode dar feedback em evaluation de outro paciente', async () => {
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(SAVED_EVAL);
      await expect(service.addFeedback('eval-1', { rating: 4 } as never, PATIENT_OTHER)).rejects.toThrow(ForbiddenException);
      expect(repo.createFeedback).not.toHaveBeenCalled();
    });
  });

  describe('getAlerts', () => {
    it('delegates to alert manager for ADMIN', async () => {
      (alertManager.getAlerts as jest.Mock).mockResolvedValue([{ id: 'a1' }]);
      const result = await service.getAlerts('p1', ADMIN, true);
      expect(result).toHaveLength(1);
      expect(alertManager.getAlerts).toHaveBeenCalledWith('p1', true);
    });

    it('SECURITY (IDOR): PATIENT não pode ler alertas de outro paciente', async () => {
      await expect(service.getAlerts('p1', PATIENT_OTHER, true)).rejects.toThrow(ForbiddenException);
      expect(alertManager.getAlerts).not.toHaveBeenCalled();
    });
  });

  describe('markAlertRead', () => {
    it('marca alerta como lido quando ator tem acesso ao paciente', async () => {
      (repo.findAlertById as jest.Mock).mockResolvedValue({ id: 'a1', patientId: 'p1' });
      (alertManager.markRead as jest.Mock).mockResolvedValue({ id: 'a1', read: true });
      const result = await service.markAlertRead('a1', ADMIN);
      expect(result).toEqual({ id: 'a1', read: true });
    });

    it('throws NotFoundException when alert not found', async () => {
      (repo.findAlertById as jest.Mock).mockResolvedValue(null);
      await expect(service.markAlertRead('nope', ADMIN)).rejects.toThrow(NotFoundException);
    });

    it('SECURITY (IDOR): PATIENT não pode marcar como lido alerta de outro paciente', async () => {
      (repo.findAlertById as jest.Mock).mockResolvedValue({ id: 'a1', patientId: 'p1' });
      await expect(service.markAlertRead('a1', PATIENT_OTHER)).rejects.toThrow(ForbiddenException);
      expect(alertManager.markRead).not.toHaveBeenCalled();
    });
  });
});
