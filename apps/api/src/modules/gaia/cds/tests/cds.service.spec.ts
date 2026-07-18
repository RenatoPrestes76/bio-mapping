import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
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

  beforeEach(() => {
    repo = makeRepo();
    alertManager = makeAlertManager();
    audit = makeAudit();
    service = new CdsService(
      repo as unknown as CdsRepository,
      alertManager as unknown as AlertManagerService,
      audit as unknown as AuditLogService,
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
      }, 'u1');
      expect(result).toEqual(SAVED_EVAL);
      expect(repo.createEvaluation).toHaveBeenCalled();
    });

    it('applies DEFAULT_RULES when no DB rules', async () => {
      await service.evaluate({ patientId: 'p1', variables: { hba1c: 7.0, bmi: 32 } }, 'u1');
      const callArgs = (repo.createEvaluation as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      expect((callArgs.rulesTriggered as unknown[]).length).toBeGreaterThan(0);
    });

    it('generates alert when priority requires it', async () => {
      await service.evaluate({ patientId: 'p1', variables: { hba1c: 7.0, bmi: 32 } }, 'u1');
      expect(alertManager.createAlert).toHaveBeenCalled();
    });

    it('does not generate alert for LOW priority', async () => {
      (alertManager.shouldAlert as jest.Mock).mockReturnValue(false);
      await service.evaluate({ patientId: 'p1', variables: {} }, 'u1');
      expect(alertManager.createAlert).not.toHaveBeenCalled();
    });

    it('logs CDS_EVALUATED audit action', async () => {
      await service.evaluate({ patientId: 'p1', variables: {} }, 'u1');
      expect(audit.log).toHaveBeenCalledWith('CDS_EVALUATED', expect.any(Object));
    });

    it('merges DB rules with built-in rules', async () => {
      const dbRule = {
        id: 'db-001', name: 'Custom Rule',
        conditions: [{ variable: 'glucose', operator: 'gte', value: 200 }],
        conjunction: 'AND', priority: 'HIGH', recommendation: 'Custom.', evidenceLevel: 'B', active: true,
      };
      (repo.findActiveRules as jest.Mock).mockResolvedValue([dbRule]);
      await service.evaluate({ patientId: 'p1', variables: { glucose: 250 } }, 'u1');
      const callArgs = (repo.createEvaluation as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      const triggered = callArgs.rulesTriggered as Array<{ id: string }>;
      expect(triggered.some((r) => r.id === 'db-001')).toBe(true);
    });

    it('sets requiresMedicalReview=true for HIGH priority result', async () => {
      (repo.createEvaluation as jest.Mock).mockResolvedValue({ ...SAVED_EVAL, priority: 'HIGH', requiresMedicalReview: true });
      const result = await service.evaluate({ patientId: 'p1', variables: { hba1c: 7.0, bmi: 32 } }, 'u1');
      expect(result.requiresMedicalReview).toBe(true);
    });
  });

  describe('findById', () => {
    it('returns evaluation when found', async () => {
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(SAVED_EVAL);
      const result = await service.findById('eval-1');
      expect(result).toEqual(SAVED_EVAL);
    });

    it('throws NotFoundException when not found', async () => {
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(null);
      await expect(service.findById('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findHistory', () => {
    it('delegates to repository', async () => {
      (repo.findHistory as jest.Mock).mockResolvedValue([SAVED_EVAL]);
      const result = await service.findHistory('p1', 10);
      expect(result).toHaveLength(1);
      expect(repo.findHistory).toHaveBeenCalledWith('p1', 10);
    });
  });

  describe('recalculate', () => {
    it('re-evaluates using stored inputData', async () => {
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(SAVED_EVAL);
      (repo.findActiveRules as jest.Mock).mockResolvedValue([]);
      (repo.createEvaluation as jest.Mock).mockResolvedValue(SAVED_EVAL);
      (alertManager.shouldAlert as jest.Mock).mockReturnValue(false);
      (audit.log as jest.Mock).mockResolvedValue(undefined);

      const result = await service.recalculate('eval-1', 'u1');
      expect(result).toBeDefined();
      expect(audit.log).toHaveBeenCalledWith('CDS_RECALCULATED', expect.any(Object));
    });

    it('throws when evaluation not found', async () => {
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(null);
      await expect(service.recalculate('bad', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addFeedback', () => {
    it('creates feedback record', async () => {
      const feedback = { id: 'f1', evaluationId: 'eval-1', userId: 'u1', rating: 4, createdAt: new Date() };
      (repo.findEvaluationById as jest.Mock).mockResolvedValue(SAVED_EVAL);
      (repo.createFeedback as jest.Mock).mockResolvedValue(feedback);
      (audit.log as jest.Mock).mockResolvedValue(undefined);

      const result = await service.addFeedback('eval-1', { rating: 4, comment: 'Good' }, 'u1');
      expect(result).toEqual(feedback);
      expect(audit.log).toHaveBeenCalledWith('CDS_FEEDBACK_ADDED', expect.any(Object));
    });
  });

  describe('getAlerts', () => {
    it('delegates to alert manager', async () => {
      (alertManager.getAlerts as jest.Mock).mockResolvedValue([{ id: 'a1' }]);
      const result = await service.getAlerts('p1', true);
      expect(result).toHaveLength(1);
      expect(alertManager.getAlerts).toHaveBeenCalledWith('p1', true);
    });
  });
});
