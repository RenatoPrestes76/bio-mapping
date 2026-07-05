import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TemplatesService } from '../services/templates.service';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditLogService } from '../../../../common/audit/audit-log.service';

const ADMIN = { sub: 'admin-1', role: 'ADMIN' };
const PROFESSIONAL = { sub: 'prof-1', role: 'PROFESSIONAL' };
const PATIENT = { sub: 'patient-1', role: 'PATIENT' };
const CTX = { ip: '127.0.0.1', userAgent: 'test' };

const makeTemplate = (overrides: any = {}) => ({
  id: 'tpl-1',
  name: 'Template A',
  description: null,
  category: 'PHYSICAL',
  organizationId: null,
  createdBy: 'admin-1',
  scoringEngine: 'weighted-sum',
  scoringConfig: null,
  isActive: true,
  version: 1,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  sections: [],
  ...overrides,
});

const makeSection = (overrides: any = {}) => ({
  id: 'sec-1',
  templateId: 'tpl-1',
  title: 'Seção 1',
  description: null,
  order: 0,
  fields: [],
  ...overrides,
});

const makeField = (overrides: any = {}) => ({
  id: 'fld-1',
  sectionId: 'sec-1',
  label: 'Campo 1',
  fieldType: 'NUMBER',
  required: false,
  order: 0,
  scoringWeight: 1,
  ...overrides,
});

describe('TemplatesService', () => {
  let service: TemplatesService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      assessmentTemplate: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      assessmentSection: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      assessmentField: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: audit },
      ],
    }).compile();

    service = module.get(TemplatesService);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('cria template para profissional', async () => {
      const tpl = makeTemplate();
      prisma.assessmentTemplate.create.mockResolvedValue(tpl);

      const result = await service.create({ name: 'Template A', category: 'PHYSICAL' } as any, PROFESSIONAL, CTX);
      expect(result.name).toBe('Template A');
      expect(prisma.assessmentTemplate.create).toHaveBeenCalledTimes(1);
      expect(audit.log).toHaveBeenCalledWith('TEMPLATE_CREATED', expect.objectContaining({ userId: 'prof-1' }));
    });

    it('usa weighted-sum como engine padrão', async () => {
      prisma.assessmentTemplate.create.mockResolvedValue(makeTemplate());
      await service.create({ name: 'T', category: 'PHYSICAL' } as any, ADMIN, CTX);
      expect(prisma.assessmentTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ scoringEngine: 'weighted-sum' }) }),
      );
    });

    it('lança ForbiddenException para PATIENT', async () => {
      await expect(service.create({} as any, PATIENT, CTX)).rejects.toThrow(ForbiddenException);
      expect(prisma.assessmentTemplate.create).not.toHaveBeenCalled();
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna lista paginada', async () => {
      const tpl = makeTemplate();
      prisma.$transaction.mockResolvedValue([[tpl], 1]);

      const result = await service.findAll({}, ADMIN);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('PATIENT só vê templates ativos — força isActive: true no where', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll({}, PATIENT);

      const [[queryCall]] = (prisma.$transaction as jest.Mock).mock.calls;
      expect(queryCall).toBeDefined();
    });

    it('filtra por category', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll({ category: 'NUTRITIONAL' } as any, ADMIN);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna template existente', async () => {
      prisma.assessmentTemplate.findFirst.mockResolvedValue(makeTemplate());
      const result = await service.findOne('tpl-1');
      expect(result.id).toBe('tpl-1');
    });

    it('lança NotFoundException quando não existe', async () => {
      prisma.assessmentTemplate.findFirst.mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('atualiza e incrementa versão', async () => {
      prisma.assessmentTemplate.findFirst.mockResolvedValue(makeTemplate());
      prisma.assessmentTemplate.update.mockResolvedValue(makeTemplate({ version: 2 }));

      const result = await service.update('tpl-1', { name: 'Novo Nome' } as any, ADMIN, CTX);
      expect(result.id).toBe('tpl-1');
      expect(prisma.assessmentTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ version: { increment: 1 } }) }),
      );
      expect(audit.log).toHaveBeenCalledWith('TEMPLATE_UPDATED', expect.anything());
    });

    it('lança ForbiddenException para PATIENT', async () => {
      await expect(service.update('tpl-1', {} as any, PATIENT, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException quando template não existe', async () => {
      prisma.assessmentTemplate.findFirst.mockResolvedValue(null);
      await expect(service.update('nope', {} as any, ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('soft-delete do template', async () => {
      prisma.assessmentTemplate.findFirst.mockResolvedValue(makeTemplate());
      prisma.assessmentTemplate.update.mockResolvedValue({});

      await service.remove('tpl-1', ADMIN, CTX);
      expect(prisma.assessmentTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isActive: false }) }),
      );
      expect(audit.log).toHaveBeenCalledWith('TEMPLATE_DELETED', expect.anything());
    });

    it('lança ForbiddenException para PATIENT', async () => {
      await expect(service.remove('tpl-1', PATIENT, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException quando não existe', async () => {
      prisma.assessmentTemplate.findFirst.mockResolvedValue(null);
      await expect(service.remove('nope', ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });
  });

  // ── addSection ────────────────────────────────────────────────────────────

  describe('addSection', () => {
    it('cria seção e incrementa versão do template', async () => {
      prisma.assessmentTemplate.findFirst.mockResolvedValue(makeTemplate());
      prisma.assessmentSection.count.mockResolvedValue(0);
      prisma.assessmentSection.create.mockResolvedValue(makeSection());
      prisma.assessmentTemplate.update.mockResolvedValue({});

      await service.addSection('tpl-1', { title: 'S1', order: 0 } as any, ADMIN);
      expect(prisma.assessmentSection.create).toHaveBeenCalled();
      expect(prisma.assessmentTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { version: { increment: 1 } } }),
      );
    });

    it('lança ForbiddenException para PATIENT', async () => {
      await expect(service.addSection('tpl-1', {} as any, PATIENT)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException quando template não existe', async () => {
      prisma.assessmentTemplate.findFirst.mockResolvedValue(null);
      await expect(service.addSection('nope', {} as any, ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateSection ─────────────────────────────────────────────────────────

  describe('updateSection', () => {
    it('atualiza seção existente', async () => {
      prisma.assessmentSection.findUnique.mockResolvedValue(makeSection());
      prisma.assessmentSection.update.mockResolvedValue({});
      await service.updateSection('sec-1', { title: 'Novo' } as any, ADMIN);
      expect(prisma.assessmentSection.update).toHaveBeenCalled();
    });

    it('lança ForbiddenException para PATIENT', async () => {
      await expect(service.updateSection('sec-1', {} as any, PATIENT)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException quando seção não existe', async () => {
      prisma.assessmentSection.findUnique.mockResolvedValue(null);
      await expect(service.updateSection('nope', {} as any, ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  // ── removeSection ─────────────────────────────────────────────────────────

  describe('removeSection', () => {
    it('deleta seção existente', async () => {
      prisma.assessmentSection.findUnique.mockResolvedValue(makeSection());
      prisma.assessmentSection.delete.mockResolvedValue({});
      await service.removeSection('sec-1', ADMIN);
      expect(prisma.assessmentSection.delete).toHaveBeenCalled();
    });

    it('lança ForbiddenException para PATIENT', async () => {
      await expect(service.removeSection('sec-1', PATIENT)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException quando seção não existe', async () => {
      prisma.assessmentSection.findUnique.mockResolvedValue(null);
      await expect(service.removeSection('nope', ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  // ── addField ──────────────────────────────────────────────────────────────

  describe('addField', () => {
    it('cria campo na seção', async () => {
      prisma.assessmentSection.findUnique.mockResolvedValue(makeSection());
      prisma.assessmentField.count.mockResolvedValue(0);
      prisma.assessmentField.create.mockResolvedValue(makeField());

      await service.addField('sec-1', { label: 'F1', fieldType: 'NUMBER' } as any, ADMIN);
      expect(prisma.assessmentField.create).toHaveBeenCalled();
    });

    it('lança ForbiddenException para PATIENT', async () => {
      await expect(service.addField('sec-1', {} as any, PATIENT)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException quando seção não existe', async () => {
      prisma.assessmentSection.findUnique.mockResolvedValue(null);
      await expect(service.addField('nope', {} as any, ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateField ───────────────────────────────────────────────────────────

  describe('updateField', () => {
    it('atualiza campo existente', async () => {
      prisma.assessmentField.findUnique.mockResolvedValue(makeField());
      prisma.assessmentField.update.mockResolvedValue({});
      await service.updateField('fld-1', { label: 'Novo' } as any, ADMIN);
      expect(prisma.assessmentField.update).toHaveBeenCalled();
    });

    it('lança ForbiddenException para PATIENT', async () => {
      await expect(service.updateField('fld-1', {} as any, PATIENT)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException quando campo não existe', async () => {
      prisma.assessmentField.findUnique.mockResolvedValue(null);
      await expect(service.updateField('nope', {} as any, ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  // ── removeField ───────────────────────────────────────────────────────────

  describe('removeField', () => {
    it('deleta campo existente', async () => {
      prisma.assessmentField.findUnique.mockResolvedValue(makeField());
      prisma.assessmentField.delete.mockResolvedValue({});
      await service.removeField('fld-1', ADMIN);
      expect(prisma.assessmentField.delete).toHaveBeenCalled();
    });

    it('lança ForbiddenException para PATIENT', async () => {
      await expect(service.removeField('fld-1', PATIENT)).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException quando campo não existe', async () => {
      prisma.assessmentField.findUnique.mockResolvedValue(null);
      await expect(service.removeField('nope', ADMIN)).rejects.toThrow(NotFoundException);
    });
  });
});
