import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnrollmentService } from '../services/enrollment.service.js';
import { EnrollmentStatus, ProgramCategory, TaskRecurrence } from '@bio/database';

const makeEnrollmentRepo = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn(),
  findByPatient: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findActive: jest.fn().mockResolvedValue([]),
  update: jest.fn(),
  ...overrides,
});

const makeMilestoneRepo = () => ({
  createMany: jest.fn().mockResolvedValue([]),
  findByEnrollment: jest.fn().mockResolvedValue([]),
  findByPatient: jest.fn().mockResolvedValue([]),
  updateProgress: jest.fn(),
});

const makeTaskRepo = () => ({
  create: jest.fn(),
  createMany: jest.fn().mockResolvedValue([]),
  findForPatient: jest.fn().mockResolvedValue([]),
  findTemplatesForEnrollment: jest.fn().mockResolvedValue([]),
  countCompletionsInRange: jest.fn().mockResolvedValue(0),
  updateStatus: jest.fn(),
  addCompletion: jest.fn(),
  hasCompletionToday: jest.fn().mockResolvedValue(false),
  expireOverdue: jest.fn(),
});

const makeProgramRepo = (program: unknown = null) => ({
  create: jest.fn(),
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(program),
  update: jest.fn(),
  softDelete: jest.fn(),
  addPhase: jest.fn(),
});

const program = {
  id: 'prog-1',
  name: 'Weight Loss Plan',
  category: ProgramCategory.WEIGHT_LOSS,
  durationDays: 90,
};

const enrollment = {
  id: 'enroll-1',
  programId: 'prog-1',
  patientId: 'patient-1',
  status: EnrollmentStatus.ACTIVE,
  startDate: new Date('2025-01-01'),
  progressPct: 0,
  adherencePct: 0,
};

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let enrollmentRepo: ReturnType<typeof makeEnrollmentRepo>;
  let milestoneRepo: ReturnType<typeof makeMilestoneRepo>;
  let taskRepo: ReturnType<typeof makeTaskRepo>;
  let programRepo: ReturnType<typeof makeProgramRepo>;

  beforeEach(() => {
    enrollmentRepo = makeEnrollmentRepo({ create: jest.fn().mockResolvedValue(enrollment) });
    milestoneRepo = makeMilestoneRepo();
    taskRepo = makeTaskRepo();
    programRepo = makeProgramRepo(program);
    service = new EnrollmentService(
      enrollmentRepo as never,
      milestoneRepo as never,
      taskRepo as never,
      programRepo as never,
    );
  });

  describe('enroll', () => {
    it('creates enrollment with milestones and tasks for WEIGHT_LOSS', async () => {
      const result = await service.enroll({ programId: 'prog-1', patientId: 'patient-1' });
      expect(result).toBe(enrollment);
      expect(enrollmentRepo.create).toHaveBeenCalled();
      expect(milestoneRepo.createMany).toHaveBeenCalled();
      expect(taskRepo.createMany).toHaveBeenCalled();
    });

    it('throws NotFoundException when program does not exist', async () => {
      programRepo.findById.mockResolvedValue(null);
      await expect(service.enroll({ programId: 'missing', patientId: 'patient-1' }))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when patient already enrolled in same program', async () => {
      enrollmentRepo.findByPatient.mockResolvedValue([{ ...enrollment, programId: 'prog-1' }]);
      await expect(service.enroll({ programId: 'prog-1', patientId: 'patient-1' }))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('uses DEFAULT tasks when no template for category', async () => {
      programRepo.findById.mockResolvedValue({ ...program, category: ProgramCategory.CUSTOM });
      await service.enroll({ programId: 'prog-1', patientId: 'patient-1' });
      const calls = taskRepo.createMany.mock.calls[0][0] as Array<{ title: string }>;
      expect(calls.some((t) => t.title === 'Check-in diário')).toBe(true);
    });

    it('creates no milestones for categories without defaults', async () => {
      programRepo.findById.mockResolvedValue({ ...program, category: ProgramCategory.CUSTOM });
      await service.enroll({ programId: 'prog-1', patientId: 'patient-1' });
      expect(milestoneRepo.createMany).not.toHaveBeenCalled();
    });
  });

  describe('calculateAdherence', () => {
    it('returns 0 when enrollment not found', async () => {
      enrollmentRepo.findById.mockResolvedValue(null);
      const result = await service.calculateAdherence('enroll-1');
      expect(result).toBe(0);
    });

    it('returns 0 when no daily tasks', async () => {
      enrollmentRepo.findById.mockResolvedValue(enrollment);
      taskRepo.findTemplatesForEnrollment.mockResolvedValue([]);
      const result = await service.calculateAdherence('enroll-1');
      expect(result).toBe(0);
    });

    it('calculates adherence correctly', async () => {
      const startDate = new Date(Date.now() - 10 * 86400000); // 10 days ago
      enrollmentRepo.findById.mockResolvedValue({ ...enrollment, startDate });
      taskRepo.findTemplatesForEnrollment.mockResolvedValue([
        { id: 'task-1', recurrence: TaskRecurrence.DAILY },
        { id: 'task-2', recurrence: TaskRecurrence.DAILY },
      ]);
      taskRepo.countCompletionsInRange.mockResolvedValue(15); // 15 of expected 20
      const result = await service.calculateAdherence('enroll-1');
      expect(result).toBe(75); // 15/(2×10)*100
    });

    it('caps adherence at 100', async () => {
      const startDate = new Date(Date.now() - 5 * 86400000);
      enrollmentRepo.findById.mockResolvedValue({ ...enrollment, startDate });
      taskRepo.findTemplatesForEnrollment.mockResolvedValue([
        { id: 'task-1', recurrence: TaskRecurrence.DAILY },
      ]);
      taskRepo.countCompletionsInRange.mockResolvedValue(10); // more than expected 5
      const result = await service.calculateAdherence('enroll-1');
      expect(result).toBe(100);
    });
  });
});
