import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentsRepository } from '../repositories/assessments.repository';
import { PrismaService } from '../../../../database/prisma.service';

describe('AssessmentsRepository', () => {
  let repo: AssessmentsRepository;
  let prisma: any;

  const ANSWER_MOCK = { id: 'ans-1', fieldId: 'f1', value: '5', score: 5, comment: null };
  const ASSESSMENT_MOCK = { id: 'asm-1', patientId: 'p-1', answers: [ANSWER_MOCK], template: null };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      assessment: {
        create: jest.fn().mockResolvedValue(ASSESSMENT_MOCK),
        findMany: jest.fn().mockResolvedValue([ASSESSMENT_MOCK]),
        findFirst: jest.fn().mockResolvedValue(ASSESSMENT_MOCK),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue(ASSESSMENT_MOCK),
      },
      assessmentAnswer: {
        upsert: jest.fn().mockResolvedValue(ANSWER_MOCK),
      },
      assessmentHistory: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get(AssessmentsRepository);
  });

  // ── create ────────────────────────────────────────────────────────────────

  it('cria avaliação com include padrão', async () => {
    prisma.assessment.create.mockResolvedValue(ASSESSMENT_MOCK);
    const result = await repo.create({ patient: { connect: { id: 'p-1' } } } as any);
    expect(prisma.assessment.create).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.objectContaining({ answers: true }) }),
    );
    expect(result.id).toBe('asm-1');
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    beforeEach(() => {
      prisma.$transaction.mockResolvedValue([[ASSESSMENT_MOCK], 1]);
    });

    it('usa paginação padrão page=1, limit=20', async () => {
      await repo.findAll('p-1', {});
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro por status', async () => {
      await repo.findAll('p-1', { status: 'COMPLETED' as any });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro por professionalId', async () => {
      await repo.findAll('p-1', { professionalId: 'prof-1' } as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro por organizationId', async () => {
      await repo.findAll('p-1', { organizationId: 'org-1' } as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro de data from e to', async () => {
      await repo.findAll('p-1', { from: '2024-01-01', to: '2024-12-31' } as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro only from', async () => {
      await repo.findAll('p-1', { from: '2024-01-01' } as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro only to', async () => {
      await repo.findAll('p-1', { to: '2024-12-31' } as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro por category', async () => {
      await repo.findAll('p-1', { category: 'PHYSICAL' } as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('usa page e limit customizados', async () => {
      await repo.findAll('p-1', { page: 2, limit: 10 } as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── findAllFiltered ───────────────────────────────────────────────────────

  describe('findAllFiltered', () => {
    beforeEach(() => {
      prisma.$transaction.mockResolvedValue([[ASSESSMENT_MOCK], 1]);
    });

    it('busca global sem filtros', async () => {
      await repo.findAllFiltered({});
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro por patientId', async () => {
      await repo.findAllFiltered({ patientId: 'p-1' } as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro por professionalId', async () => {
      await repo.findAllFiltered({ professionalId: 'prof-1' } as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro por organizationId', async () => {
      await repo.findAllFiltered({ organizationId: 'org-1' } as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro por status', async () => {
      await repo.findAllFiltered({ status: 'LOCKED' as any });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro de data from e to', async () => {
      await repo.findAllFiltered({ from: '2024-01-01', to: '2024-12-31' } as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('aplica filtro por category', async () => {
      await repo.findAllFiltered({ category: 'NUTRITIONAL' } as any);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  it('findById retorna avaliação com includes completos', async () => {
    prisma.assessment.findFirst.mockResolvedValue(ASSESSMENT_MOCK);
    const result = await repo.findById('asm-1');
    expect(prisma.assessment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'asm-1', deletedAt: null } }),
    );
    expect(result?.id).toBe('asm-1');
  });

  it('findById retorna null quando não encontrado', async () => {
    prisma.assessment.findFirst.mockResolvedValue(null);
    const result = await repo.findById('nope');
    expect(result).toBeNull();
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('atualiza sem histórico quando array vazio', async () => {
      const txFn = jest.fn().mockImplementation(async (cb) => {
        const tx = {
          assessment: { update: jest.fn().mockResolvedValue(ASSESSMENT_MOCK) },
          assessmentHistory: { createMany: jest.fn() },
        };
        return cb(tx);
      });
      prisma.$transaction = txFn;

      const result = await repo.update('asm-1', { notes: 'ok' } as any, []);
      expect(result.id).toBe('asm-1');
    });

    it('cria histórico quando há entries', async () => {
      let capturedTx: any;
      prisma.$transaction = jest.fn().mockImplementation(async (cb) => {
        capturedTx = {
          assessment: { update: jest.fn().mockResolvedValue(ASSESSMENT_MOCK) },
          assessmentHistory: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
        };
        return cb(capturedTx);
      });

      const historyEntry = { assessmentId: 'asm-1', field: 'notes', previousValue: 'a', newValue: 'b', changedBy: 'u1', ip: null, userAgent: null };
      await repo.update('asm-1', { notes: 'b' } as any, [historyEntry]);
      expect(capturedTx.assessmentHistory.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: [historyEntry] }),
      );
    });
  });

  // ── upsertAnswers ─────────────────────────────────────────────────────────

  it('faz upsert de respostas em transação', async () => {
    prisma.$transaction.mockResolvedValue([ANSWER_MOCK]);
    const result = await repo.upsertAnswers('asm-1', [{ fieldId: 'f1', value: '5', score: 5, comment: null }]);
    expect(prisma.assessmentAnswer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assessmentId_fieldId: { assessmentId: 'asm-1', fieldId: 'f1' } },
      }),
    );
  });

  it('upsertAnswers lida com value/score/comment null', async () => {
    prisma.$transaction.mockResolvedValue([]);
    await repo.upsertAnswers('asm-1', [{ fieldId: 'f1' }]);
    expect(prisma.assessmentAnswer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ value: null, score: null, comment: null }),
      }),
    );
  });

  // ── softDelete ────────────────────────────────────────────────────────────

  it('softDelete atualiza deletedAt', async () => {
    prisma.assessment.update.mockResolvedValue({ id: 'asm-1' });
    await repo.softDelete('asm-1');
    expect(prisma.assessment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'asm-1' }, data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    );
  });
});
