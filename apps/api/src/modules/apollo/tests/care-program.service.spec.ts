import { NotFoundException } from '@nestjs/common';
import { CareProgramService } from '../services/care-program.service.js';
import { ProgramCategory, ProgramStatus } from '@bio/database';

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn(),
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  update: jest.fn(),
  softDelete: jest.fn(),
  addPhase: jest.fn(),
  ...overrides,
});

const program = {
  id: 'prog-1',
  name: 'Weight Loss Plan',
  category: ProgramCategory.WEIGHT_LOSS,
  status: ProgramStatus.ACTIVE,
  durationDays: 90,
  createdBy: 'user-1',
  deletedAt: null,
};

describe('CareProgramService', () => {
  let service: CareProgramService;

  beforeEach(() => {
    service = new CareProgramService(makeRepo({ findById: jest.fn().mockResolvedValue(program) }) as never);
  });

  describe('createProgram', () => {
    it('creates and returns program', async () => {
      const repo = makeRepo({ create: jest.fn().mockResolvedValue(program) });
      service = new CareProgramService(repo as never);
      const result = await service.createProgram({
        name: 'Weight Loss Plan',
        category: ProgramCategory.WEIGHT_LOSS,
        createdBy: 'user-1',
      });
      expect(result).toBe(program);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Weight Loss Plan' }));
    });
  });

  describe('listPrograms', () => {
    it('returns programs from repo', async () => {
      const repo = makeRepo({ findAll: jest.fn().mockResolvedValue([program]) });
      service = new CareProgramService(repo as never);
      const result = await service.listPrograms({});
      expect(result).toEqual([program]);
    });

    it('passes category filter', async () => {
      const repo = makeRepo({ findAll: jest.fn().mockResolvedValue([]) });
      service = new CareProgramService(repo as never);
      await service.listPrograms({ category: ProgramCategory.DIABETES });
      expect(repo.findAll).toHaveBeenCalledWith({ category: ProgramCategory.DIABETES });
    });
  });

  describe('getProgram', () => {
    it('returns program when found', async () => {
      const result = await service.getProgram('prog-1');
      expect(result).toBe(program);
    });

    it('throws NotFoundException when not found', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      service = new CareProgramService(repo as never);
      await expect(service.getProgram('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateProgram', () => {
    it('calls update on repo', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(program),
        update: jest.fn().mockResolvedValue({ ...program, name: 'New Name' }),
      });
      service = new CareProgramService(repo as never);
      const result = await service.updateProgram('prog-1', { name: 'New Name' });
      expect(repo.update).toHaveBeenCalledWith('prog-1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });
  });

  describe('deleteProgram', () => {
    it('calls softDelete on repo', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(program),
        softDelete: jest.fn().mockResolvedValue({ ...program, deletedAt: new Date() }),
      });
      service = new CareProgramService(repo as never);
      await service.deleteProgram('prog-1');
      expect(repo.softDelete).toHaveBeenCalledWith('prog-1');
    });
  });

  describe('addPhase', () => {
    it('calls addPhase on repo', async () => {
      const phase = { id: 'phase-1', programId: 'prog-1', name: 'Phase 1', order: 1 };
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(program),
        addPhase: jest.fn().mockResolvedValue(phase),
      });
      service = new CareProgramService(repo as never);
      const result = await service.addPhase('prog-1', { name: 'Phase 1', order: 1 });
      expect(result).toBe(phase);
    });
  });
});
