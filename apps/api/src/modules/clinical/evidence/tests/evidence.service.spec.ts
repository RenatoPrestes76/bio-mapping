import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { AssessmentStatus } from '@bio/database';
import { EvidenceService } from '../services/evidence.service';
import { PrismaService } from '../../../../database/prisma.service';
import { AuditLogService } from '../../../../common/audit/audit-log.service';
import { EVIDENCE_STORAGE } from '../providers/storage.interface';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN     = { sub: 'admin-1', role: 'ADMIN' };
const PROF      = { sub: 'prof-1',  role: 'PROFESSIONAL' };
const PATIENT_A = { sub: 'user-1',  role: 'PATIENT' };
const CTX       = { ip: '127.0.0.1', userAgent: 'test' };

const makeFile = (mimetype = 'image/jpeg'): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'foto.jpg',
  encoding: '7bit',
  mimetype,
  buffer: Buffer.from(''),
  size: 1024,
  stream: null as any,
  destination: '',
  filename: 'foto.jpg',
  path: '',
});

const makeAssessment = (o: any = {}) => ({
  id: 'asm-1',
  patientId: 'patient-1',
  status: AssessmentStatus.DRAFT,
  deletedAt: null,
  patient: { id: 'patient-1', userId: 'user-1' },
  ...o,
});

const makeEvidence = (o: any = {}) => ({
  id: 'ev-1',
  assessmentId: 'asm-1',
  type: 'PHOTO',
  filename: 'uuid.jpg',
  originalName: 'foto.jpg',
  mimeType: 'image/jpeg',
  size: 1024,
  url: '/uploads/evidence/asm-1/uuid.jpg',
  uploadedBy: 'admin-1',
  createdAt: new Date(),
  ...o,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EvidenceService', () => {
  let service: EvidenceService;
  let prisma: any;
  let storage: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      assessment: { findFirst: jest.fn() },
      assessmentEvidence: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    storage = {
      save: jest.fn().mockResolvedValue({
        filename: 'uuid.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: '/uploads/evidence/asm-1/uuid.jpg',
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenceService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: audit },
        { provide: EVIDENCE_STORAGE, useValue: storage },
      ],
    }).compile();

    service = module.get(EvidenceService);
  });

  // ── upload ──────────────────────────────────────────────────────────────────

  describe('upload', () => {
    it('faz upload de imagem JPEG e detecta PHOTO', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment());
      prisma.assessmentEvidence.create.mockResolvedValue(makeEvidence());

      const result = await service.upload('asm-1', makeFile('image/jpeg'), ADMIN, CTX);
      expect(result.type).toBe('PHOTO');
      expect(storage.save).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith('EVIDENCE_UPLOADED', expect.anything());
    });

    it('detecta PDF corretamente', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment());
      prisma.assessmentEvidence.create.mockResolvedValue(makeEvidence({ type: 'PDF' }));

      await service.upload('asm-1', makeFile('application/pdf'), ADMIN, CTX);
      expect(prisma.assessmentEvidence.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: 'PDF' }) }),
      );
    });

    it('detecta VIDEO para video/mp4', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment());
      prisma.assessmentEvidence.create.mockResolvedValue(makeEvidence({ type: 'VIDEO' }));

      await service.upload('asm-1', makeFile('video/mp4'), ADMIN, CTX);
      expect(prisma.assessmentEvidence.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: 'VIDEO' }) }),
      );
    });

    it('MIME desconhecido cai como DOCUMENT', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment());
      prisma.assessmentEvidence.create.mockResolvedValue(makeEvidence({ type: 'DOCUMENT' }));

      await service.upload('asm-1', makeFile('application/octet-stream'), ADMIN, CTX);
      expect(prisma.assessmentEvidence.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: 'DOCUMENT' }) }),
      );
    });

    it('lança UnprocessableEntityException quando avaliação LOCKED', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment({ status: AssessmentStatus.LOCKED }));
      await expect(service.upload('asm-1', makeFile(), ADMIN, CTX)).rejects.toThrow(UnprocessableEntityException);
    });

    it('lança NotFoundException quando avaliação não existe', async () => {
      prisma.assessment.findFirst.mockResolvedValue(null);
      await expect(service.upload('nope', makeFile(), ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException quando PATIENT não é dono', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment({ patient: { id: 'p-1', userId: 'outro' } }));
      await expect(service.upload('asm-1', makeFile(), PATIENT_A, CTX)).rejects.toThrow(ForbiddenException);
    });

    it('PATIENT dono pode fazer upload', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment());
      prisma.assessmentEvidence.create.mockResolvedValue(makeEvidence());

      await expect(service.upload('asm-1', makeFile(), PATIENT_A, CTX)).resolves.toBeDefined();
    });

    it('PROFESSIONAL pode fazer upload', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment());
      prisma.assessmentEvidence.create.mockResolvedValue(makeEvidence());

      await expect(service.upload('asm-1', makeFile(), PROF, CTX)).resolves.toBeDefined();
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna lista de evidências para ADMIN', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment());
      prisma.assessmentEvidence.findMany.mockResolvedValue([makeEvidence()]);

      const result = await service.findAll('asm-1', ADMIN);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ev-1');
    });

    it('lança NotFoundException quando avaliação não existe', async () => {
      prisma.assessment.findFirst.mockResolvedValue(null);
      await expect(service.findAll('nope', ADMIN)).rejects.toThrow(NotFoundException);
    });

    it('PATIENT dono pode listar evidências', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment());
      prisma.assessmentEvidence.findMany.mockResolvedValue([]);

      await expect(service.findAll('asm-1', PATIENT_A)).resolves.toEqual([]);
    });

    it('PATIENT não dono lança ForbiddenException', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment({ patient: { id: 'p-1', userId: 'outro' } }));
      await expect(service.findAll('asm-1', PATIENT_A)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deleta evidência existente', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment());
      prisma.assessmentEvidence.findFirst.mockResolvedValue(makeEvidence());
      prisma.assessmentEvidence.delete.mockResolvedValue({});

      await service.remove('asm-1', 'ev-1', ADMIN, CTX);
      expect(storage.delete).toHaveBeenCalledWith('uuid.jpg', 'asm-1');
      expect(prisma.assessmentEvidence.delete).toHaveBeenCalledWith({ where: { id: 'ev-1' } });
      expect(audit.log).toHaveBeenCalledWith('EVIDENCE_DELETED', expect.anything());
    });

    it('lança NotFoundException quando evidência não encontrada', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment());
      prisma.assessmentEvidence.findFirst.mockResolvedValue(null);

      await expect(service.remove('asm-1', 'ev-nope', ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });

    it('lança UnprocessableEntityException quando avaliação LOCKED', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment({ status: AssessmentStatus.LOCKED }));
      await expect(service.remove('asm-1', 'ev-1', ADMIN, CTX)).rejects.toThrow(UnprocessableEntityException);
    });

    it('lança NotFoundException quando avaliação não existe', async () => {
      prisma.assessment.findFirst.mockResolvedValue(null);
      await expect(service.remove('nope', 'ev-1', ADMIN, CTX)).rejects.toThrow(NotFoundException);
    });

    it('PATIENT dono pode remover evidência', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment());
      prisma.assessmentEvidence.findFirst.mockResolvedValue(makeEvidence());
      prisma.assessmentEvidence.delete.mockResolvedValue({});

      await expect(service.remove('asm-1', 'ev-1', PATIENT_A, CTX)).resolves.toBeUndefined();
    });

    it('PATIENT não dono lança ForbiddenException', async () => {
      prisma.assessment.findFirst.mockResolvedValue(makeAssessment({ patient: { id: 'p-1', userId: 'outro' } }));
      await expect(service.remove('asm-1', 'ev-1', PATIENT_A, CTX)).rejects.toThrow(ForbiddenException);
    });
  });
});
