import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { AssessmentStatus } from '@bio/database';
import { AssessmentsService } from '../services/assessments.service';
import { AssessmentsRepository } from '../repositories/assessments.repository';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditLogService } from '../../../../common/audit/audit-log.service';
import { ScoringService } from '../../scoring/services/scoring.service';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN      = { sub: 'admin-1',      role: 'ADMIN' };
const PROF       = { sub: 'prof-user-1',  role: 'PROFESSIONAL' };
const PATIENT_ACT = { sub: 'patient-user-1', role: 'PATIENT' };
const CTX        = { ip: '127.0.0.1', userAgent: 'test' };

const makePatient = (o: any = {}) => ({
  id: 'patient-1', userId: 'patient-user-1', primaryProfessionalId: null, deletedAt: null, ...o,
});

const makeTemplate = (o: any = {}) => ({
  id: 'tpl-1', name: 'Avaliação Física', isActive: true, deletedAt: null,
  scoringEngine: 'weighted-sum', scoringConfig: null,
  sections: [{ id: 's1', title: 'S1', order: 0, fields: [] }],
  ...o,
});

const makeAssessment = (o: any = {}) => ({
  id: 'asm-1',
  patientId: 'patient-1',
  templateId: 'tpl-1',
  professionalId: null,
  organizationId: null,
  status: AssessmentStatus.DRAFT,
  totalScore: null,
  maxScore: null,
  scorePercent: null,
  classification: null,
  riskLevel: null,
  notes: null,
  performedAt: new Date(),
  lockedAt: null,
  lockedBy: null,
  validatedAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  answers: [],
  template: makeTemplate(),
  patient: makePatient(),
  ...o,
});

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('AssessmentsService', () => {
  let service: AssessmentsService;
  let repo: jest.Mocked<AssessmentsRepository>;
  let prisma: any;
  let scoring: jest.Mocked<ScoringService>;
  let audit: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAllFiltered: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      upsertAnswers: jest.fn(),
      softDelete: jest.fn(),
    } as any;

    prisma = {
      $transaction: jest.fn(),
      patient: { findFirst: jest.fn() },
      assessmentTemplate: { findFirst: jest.fn() },
      professional: { findFirst: jest.fn() },
      membership: { findFirst: jest.fn() },
      vitalRecord: { findMany: jest.fn() },
      assessment: { findMany: jest.fn() },
    };

    scoring = { calculate: jest.fn(), listEngines: jest.fn() } as any;
    audit   = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: AssessmentsRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
        { provide: ScoringService, useValue: scoring },
        { provide: AuditLogService, useValue: audit },
      ],
    }).compile();

    service = module.get(AssessmentsService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    beforeEach(() => {
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      prisma.assessmentTemplate.findFirst.mockResolvedValue(makeTemplate());
      repo.create.mockResolvedValue(makeAssessment());
    });

    it('cria avaliação para ADMIN', async () => {
      const result = await service.create('patient-1', { templateId: 'tpl-1' } as any, ADMIN, CTX);
      expect(result.id).toBe('asm-1');
      expect(audit.log).toHaveBeenCalledWith('ASSESSMENT_CREATED', expect.anything());
    });

    it('lança NotFoundException se paciente não encontrado', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      await expect(service.create('nope', { templateId: 'tpl-1' } as any, ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });

    it('lança NotFoundException se template não encontrado ou inativo', async () => {
      prisma.assessmentTemplate.findFirst.mockResolvedValue(null);
      await expect(service.create('patient-1', { templateId: 'nope' } as any, ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });

    it('PATIENT pode criar avaliação para si mesmo', async () => {
      const result = await service.create('patient-1', { templateId: 'tpl-1' } as any, PATIENT_ACT, CTX);
      expect(result.id).toBe('asm-1');
    });

    it('PATIENT não pode criar avaliação para outro paciente', async () => {
      prisma.patient.findFirst.mockResolvedValue(makePatient({ userId: 'outro-user' }));
      await expect(service.create('patient-1', { templateId: 'tpl-1' } as any, PATIENT_ACT, CTX)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna paginação para ADMIN', async () => {
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      repo.findAll.mockResolvedValue([[makeAssessment()], 1]);
      const result = await service.findAll('patient-1', {}, ADMIN);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('PATIENT só acessa suas próprias avaliações', async () => {
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      repo.findAll.mockResolvedValue([[], 0]);
      await service.findAll('patient-1', {}, PATIENT_ACT);
      expect(repo.findAll).toHaveBeenCalled();
    });

    it('PATIENT não pode acessar avaliações de outro paciente', async () => {
      prisma.patient.findFirst.mockResolvedValue(makePatient({ userId: 'outro' }));
      await expect(service.findAll('patient-1', {}, PATIENT_ACT)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── search ──────────────────────────────────────────────────────────────────

  describe('search', () => {
    it('permite busca global para ADMIN', async () => {
      repo.findAllFiltered.mockResolvedValue([[makeAssessment()], 1]);
      const result = await service.search({}, ADMIN);
      expect(result.data).toHaveLength(1);
    });

    it('lança ForbiddenException para PATIENT', async () => {
      await expect(service.search({}, PATIENT_ACT)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna avaliação para ADMIN', async () => {
      repo.findById.mockResolvedValue(makeAssessment());
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      const result = await service.findOne('asm-1', ADMIN);
      expect(result.id).toBe('asm-1');
    });

    it('lança NotFoundException quando não existe', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne('nope', ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('atualiza avaliação em DRAFT', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ status: AssessmentStatus.DRAFT }));
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      repo.update.mockResolvedValue(makeAssessment({ status: AssessmentStatus.IN_PROGRESS }));

      const result = await service.update('asm-1', { notes: 'ok' } as any, ADMIN, CTX);
      expect(result.status).toBe(AssessmentStatus.IN_PROGRESS);
      expect(audit.log).toHaveBeenCalledWith('ASSESSMENT_UPDATED', expect.anything());
    });

    it('faz upsert de respostas quando fornecidas', async () => {
      repo.findById.mockResolvedValue(makeAssessment());
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      repo.update.mockResolvedValue(makeAssessment());
      repo.upsertAnswers.mockResolvedValue([]);

      await service.update('asm-1', { answers: [{ fieldId: 'f1', value: '5' }] } as any, ADMIN, CTX);
      expect(repo.upsertAnswers).toHaveBeenCalledWith('asm-1', [{ fieldId: 'f1', value: '5' }]);
    });

    it('lança UnprocessableEntityException quando LOCKED', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ status: AssessmentStatus.LOCKED }));
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      await expect(service.update('asm-1', {} as any, ADMIN, CTX)).rejects.toThrow(UnprocessableEntityException);
    });

    it('registra histórico quando notes muda', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ notes: 'old' }));
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      repo.update.mockResolvedValue(makeAssessment({ notes: 'new' }));

      await service.update('asm-1', { notes: 'new' } as any, ADMIN, CTX);
      const [, , history] = repo.update.mock.calls[0];
      expect(history).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'notes' })]));
    });
  });

  // ── complete ─────────────────────────────────────────────────────────────────

  describe('complete', () => {
    beforeEach(() => {
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      repo.update.mockImplementation((_, data) => Promise.resolve(makeAssessment({ ...data })));
    });

    it('calcula score e transita para COMPLETED', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ status: AssessmentStatus.IN_PROGRESS }));
      scoring.calculate.mockReturnValue({
        totalScore: 80, maxScore: 100, percentage: 80,
        classification: 'Excelente', riskLevel: 'LOW', sectionScores: [],
      });

      const result = await service.complete('asm-1', ADMIN, CTX);
      expect(scoring.calculate).toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith(
        'asm-1',
        expect.objectContaining({ status: AssessmentStatus.COMPLETED, totalScore: 80 }),
        expect.any(Array),
      );
      expect(audit.log).toHaveBeenCalledWith('ASSESSMENT_COMPLETED', expect.anything());
    });

    it('lança UnprocessableEntityException quando LOCKED', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ status: AssessmentStatus.LOCKED }));
      await expect(service.complete('asm-1', ADMIN, CTX)).rejects.toThrow(UnprocessableEntityException);
    });

    it('lança UnprocessableEntityException quando já VALIDATED', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ status: AssessmentStatus.VALIDATED }));
      await expect(service.complete('asm-1', ADMIN, CTX)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── validate ─────────────────────────────────────────────────────────────────

  describe('validate', () => {
    it('transita de COMPLETED para VALIDATED', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ status: AssessmentStatus.COMPLETED }));
      repo.update.mockResolvedValue(makeAssessment({ status: AssessmentStatus.VALIDATED }));

      const result = await service.validate('asm-1', PROF, CTX);
      expect(repo.update).toHaveBeenCalledWith(
        'asm-1',
        expect.objectContaining({ status: AssessmentStatus.VALIDATED }),
        expect.any(Array),
      );
      expect(audit.log).toHaveBeenCalledWith('ASSESSMENT_VALIDATED', expect.anything());
    });

    it('lança ForbiddenException para PATIENT', async () => {
      await expect(service.validate('asm-1', PATIENT_ACT, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('lança UnprocessableEntityException quando não está COMPLETED', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ status: AssessmentStatus.DRAFT }));
      await expect(service.validate('asm-1', ADMIN, CTX)).rejects.toThrow(UnprocessableEntityException);
    });

    it('lança UnprocessableEntityException quando LOCKED', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ status: AssessmentStatus.LOCKED }));
      await expect(service.validate('asm-1', ADMIN, CTX)).rejects.toThrow(UnprocessableEntityException);
    });

    it('lança NotFoundException quando não encontrada', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.validate('nope', ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });
  });

  // ── lock ─────────────────────────────────────────────────────────────────────

  describe('lock', () => {
    it('transita de VALIDATED para LOCKED', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ status: AssessmentStatus.VALIDATED }));
      repo.update.mockResolvedValue(makeAssessment({ status: AssessmentStatus.LOCKED }));

      await service.lock('asm-1', ADMIN, CTX);
      expect(repo.update).toHaveBeenCalledWith(
        'asm-1',
        expect.objectContaining({ status: AssessmentStatus.LOCKED, lockedBy: ADMIN.sub }),
        expect.any(Array),
      );
      expect(audit.log).toHaveBeenCalledWith('ASSESSMENT_LOCKED', expect.anything());
    });

    it('lança ForbiddenException para PATIENT', async () => {
      await expect(service.lock('asm-1', PATIENT_ACT, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('lança UnprocessableEntityException quando já LOCKED', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ status: AssessmentStatus.LOCKED }));
      await expect(service.lock('asm-1', ADMIN, CTX)).rejects.toThrow(UnprocessableEntityException);
    });

    it('lança UnprocessableEntityException quando não está VALIDATED', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ status: AssessmentStatus.COMPLETED }));
      await expect(service.lock('asm-1', ADMIN, CTX)).rejects.toThrow(UnprocessableEntityException);
    });

    it('lança NotFoundException quando não encontrada', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.lock('nope', ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deleta avaliação em DRAFT', async () => {
      repo.findById.mockResolvedValue(makeAssessment());
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      repo.softDelete.mockResolvedValue(undefined);

      await service.remove('asm-1', ADMIN, CTX);
      expect(repo.softDelete).toHaveBeenCalledWith('asm-1');
      expect(audit.log).toHaveBeenCalledWith('ASSESSMENT_DELETED', expect.anything());
    });

    it('lança UnprocessableEntityException quando LOCKED', async () => {
      repo.findById.mockResolvedValue(makeAssessment({ status: AssessmentStatus.LOCKED }));
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      await expect(service.remove('asm-1', ADMIN, CTX)).rejects.toThrow(UnprocessableEntityException);
    });

    it('lança NotFoundException quando não encontrada', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove('nope', ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });
  });

  // ── summary ─────────────────────────────────────────────────────────────────

  describe('summary', () => {
    it('retorna dashboard com contagens corretas', async () => {
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      prisma.assessment.findMany.mockResolvedValue([
        makeAssessment({ status: 'COMPLETED', totalScore: 80, performedAt: new Date(), template: makeTemplate({ category: 'PHYSICAL' }) }),
        makeAssessment({ id: 'asm-2', status: 'LOCKED', totalScore: null, performedAt: null, template: makeTemplate() }),
      ]);

      const result = await service.summary('patient-1', ADMIN);
      expect(result.totalAssessments).toBe(2);
      expect(result.completedCount).toBe(1);
      expect(result.lockedCount).toBe(1);
      expect(result.scoreEvolution).toHaveLength(1);
    });

    it('lança ForbiddenException quando PATIENT acessa outro paciente', async () => {
      prisma.patient.findFirst.mockResolvedValue(makePatient({ userId: 'outro' }));
      await expect(service.summary('patient-1', PATIENT_ACT)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── timeline ─────────────────────────────────────────────────────────────────

  describe('timeline', () => {
    it('retorna eventos de vitais e avaliações ordenados por data', async () => {
      prisma.patient.findFirst.mockResolvedValue(makePatient());

      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-06-01');

      prisma.$transaction.mockResolvedValue([
        [{ id: 'v1', recordedAt: oldDate, status: 'ACTIVE', source: 'MANUAL', notes: null }],
        [makeAssessment({ id: 'asm-t1', performedAt: newDate, template: { name: 'Físico', category: 'PHYSICAL' } })],
      ]);

      const result = await service.timeline('patient-1', ADMIN);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('ASSESSMENT'); // mais recente
      expect(result[1].type).toBe('VITAL_RECORD');
    });

    it('lança ForbiddenException quando PATIENT acessa outro paciente', async () => {
      prisma.patient.findFirst.mockResolvedValue(makePatient({ userId: 'outro' }));
      await expect(service.timeline('patient-1', PATIENT_ACT)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── assertProfessionalAccess ──────────────────────────────────────────────────

  describe('acesso de profissional', () => {
    it('profissional primário tem acesso de leitura', async () => {
      prisma.patient.findFirst.mockResolvedValue(makePatient({ primaryProfessionalId: 'prof-1' }));
      repo.findAll.mockResolvedValue([[], 0]);
      prisma.professional.findFirst.mockResolvedValue({ id: 'prof-1', userId: 'prof-user-1', deletedAt: null });

      await expect(service.findAll('patient-1', {}, PROF)).resolves.toBeDefined();
    });

    it('profissional sem vínculo lança ForbiddenException', async () => {
      prisma.patient.findFirst.mockResolvedValue(makePatient({ primaryProfessionalId: 'outro-prof' }));
      prisma.professional.findFirst.mockResolvedValue({ id: 'prof-1', userId: 'prof-user-1', deletedAt: null });
      prisma.membership.findFirst.mockResolvedValue(null);

      await expect(service.findAll('patient-1', {}, PROF)).rejects.toThrow(ForbiddenException);
    });

    it('profissional sem cadastro lança ForbiddenException', async () => {
      prisma.patient.findFirst.mockResolvedValue(makePatient({ primaryProfessionalId: null }));
      prisma.professional.findFirst.mockResolvedValue(null);
      prisma.membership.findFirst.mockResolvedValue(null);

      await expect(service.findAll('patient-1', {}, PROF)).rejects.toThrow(ForbiddenException);
    });

    it('DOCTOR tem mesmo acesso de leitura que PROFESSIONAL', async () => {
      const DOCTOR = { sub: 'doctor-user-1', role: 'DOCTOR' };
      prisma.patient.findFirst.mockResolvedValue(makePatient({ primaryProfessionalId: 'doc-1' }));
      repo.findAll.mockResolvedValue([[], 0]);
      prisma.professional.findFirst.mockResolvedValue({ id: 'doc-1', userId: 'doctor-user-1', deletedAt: null });

      await expect(service.findAll('patient-1', {}, DOCTOR)).resolves.toBeDefined();
    });

    it('DOCTOR tem mesmo acesso de escrita que PROFESSIONAL', async () => {
      const DOCTOR = { sub: 'doctor-user-1', role: 'DOCTOR' };
      prisma.patient.findFirst.mockResolvedValue(makePatient({ primaryProfessionalId: 'doc-1' }));
      prisma.assessmentTemplate.findFirst.mockResolvedValue(makeTemplate());
      repo.create.mockResolvedValue(makeAssessment());
      prisma.professional.findFirst.mockResolvedValue({ id: 'doc-1', userId: 'doctor-user-1', deletedAt: null });

      await expect(
        service.create('patient-1', { templateId: 'tpl-1' } as any, DOCTOR, CTX),
      ).resolves.toBeDefined();
    });

    it('role desconhecido em leitura lança ForbiddenException', async () => {
      const UNKNOWN = { sub: 'x', role: 'UNKNOWN' };
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      await expect(service.findAll('patient-1', {}, UNKNOWN)).rejects.toThrow(ForbiddenException);
    });

    it('role desconhecido em escrita lança ForbiddenException', async () => {
      const UNKNOWN = { sub: 'x', role: 'UNKNOWN' };
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      prisma.assessmentTemplate.findFirst.mockResolvedValue(makeTemplate());
      await expect(service.create('patient-1', { templateId: 'tpl-1' } as any, UNKNOWN, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('profissional com membership compartilhada tem acesso', async () => {
      prisma.patient.findFirst.mockResolvedValue(makePatient({ primaryProfessionalId: 'outro-prof' }));
      repo.findAll.mockResolvedValue([[], 0]);
      prisma.professional.findFirst.mockResolvedValue({ id: 'prof-1', userId: 'prof-user-1', deletedAt: null });
      prisma.membership.findFirst.mockResolvedValue({ id: 'mem-1' });

      await expect(service.findAll('patient-1', {}, PROF)).resolves.toBeDefined();
    });
  });

  // ── complete com template contendo campos ────────────────────────────────

  describe('complete com campos reais', () => {
    it('passa campos e seções do template ao scoring engine', async () => {
      const templateWithFields = makeTemplate({
        sections: [
          {
            id: 's1', title: 'S1', order: 0,
            fields: [{ id: 'f1', sectionId: 's1', label: 'F1', scoringWeight: 1, min: 0, max: 10, required: true }],
          },
        ],
      });
      const assessmentWithAnswers = makeAssessment({
        status: AssessmentStatus.IN_PROGRESS,
        template: templateWithFields,
        answers: [{ fieldId: 'f1', value: '8', score: 8 }],
      });

      repo.findById.mockResolvedValue(assessmentWithAnswers);
      prisma.patient.findFirst.mockResolvedValue(makePatient());
      scoring.calculate.mockReturnValue({
        totalScore: 8, maxScore: 10, percentage: 80,
        classification: 'Excelente', riskLevel: 'LOW', sectionScores: [],
      });
      repo.update.mockResolvedValue(makeAssessment({ status: AssessmentStatus.COMPLETED, totalScore: 8 }));

      await service.complete('asm-1', ADMIN, CTX);
      expect(scoring.calculate).toHaveBeenCalledWith(
        'weighted-sum',
        expect.objectContaining({
          fields: expect.arrayContaining([expect.objectContaining({ id: 'f1' })]),
          sections: expect.arrayContaining([expect.objectContaining({ id: 's1' })]),
          answers: [{ fieldId: 'f1', value: '8', score: 8 }],
        }),
      );
    });
  });
});
