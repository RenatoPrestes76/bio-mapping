import { TaskEngineService } from '../services/task-engine.service.js';
import { TaskStatus, TaskRecurrence } from '@bio/database';

const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  create: jest.fn(),
  createMany: jest.fn(),
  findForPatient: jest.fn().mockResolvedValue([]),
  findTemplatesForEnrollment: jest.fn().mockResolvedValue([]),
  updateStatus: jest.fn(),
  addCompletion: jest.fn().mockResolvedValue({}),
  hasCompletionToday: jest.fn().mockResolvedValue(false),
  countCompletionsInRange: jest.fn().mockResolvedValue(0),
  expireOverdue: jest.fn().mockResolvedValue({ count: 0 }),
  ...overrides,
});

const dailyTask = {
  id: 'task-1',
  title: 'Treino',
  patientId: 'patient-1',
  recurrence: TaskRecurrence.DAILY,
  status: TaskStatus.ACTIVE,
  dueDate: null,
};

const onceTask = {
  id: 'task-2',
  title: 'Avaliação inicial',
  patientId: 'patient-1',
  recurrence: TaskRecurrence.ONCE,
  status: TaskStatus.PENDING,
  dueDate: new Date(),
};

describe('TaskEngineService', () => {
  let service: TaskEngineService;

  beforeEach(() => {
    service = new TaskEngineService(makeRepo() as never);
  });

  describe('getTasksForToday', () => {
    it('returns tasks annotated with completedToday and isDueToday', async () => {
      const repo = makeRepo({
        findForPatient: jest.fn().mockResolvedValue([dailyTask, onceTask]),
        hasCompletionToday: jest.fn().mockResolvedValue(true),
      });
      service = new TaskEngineService(repo as never);
      const tasks = await service.getTasksForToday('patient-1');
      expect(tasks).toHaveLength(2);
      expect(tasks[0].completedToday).toBe(true);
      expect(tasks[0].isDueToday).toBe(true);
    });

    it('ONCE task has completedToday=false regardless of completions', async () => {
      const repo = makeRepo({
        findForPatient: jest.fn().mockResolvedValue([onceTask]),
        hasCompletionToday: jest.fn().mockResolvedValue(true),
      });
      service = new TaskEngineService(repo as never);
      const tasks = await service.getTasksForToday('patient-1');
      expect(tasks[0].completedToday).toBe(false);
    });

    it('returns empty array when patient has no tasks', async () => {
      const tasks = await service.getTasksForToday('patient-1');
      expect(tasks).toEqual([]);
    });
  });

  describe('completeTask', () => {
    it('updates status to COMPLETED for ONCE task', async () => {
      const repo = makeRepo({
        findForPatient: jest.fn().mockResolvedValue([onceTask]),
        updateStatus: jest.fn().mockResolvedValue({ ...onceTask, status: TaskStatus.COMPLETED }),
      });
      service = new TaskEngineService(repo as never);
      await service.completeTask('task-2', 'patient-1');
      expect(repo.updateStatus).toHaveBeenCalledWith('task-2', TaskStatus.COMPLETED);
    });

    it('adds completion for DAILY task (status stays ACTIVE)', async () => {
      const repo = makeRepo({
        findForPatient: jest.fn().mockResolvedValue([dailyTask]),
        addCompletion: jest.fn().mockResolvedValue({}),
        updateStatus: jest.fn().mockResolvedValue(dailyTask),
      });
      service = new TaskEngineService(repo as never);
      await service.completeTask('task-1', 'patient-1', 30, 'ran 30 min');
      expect(repo.addCompletion).toHaveBeenCalledWith('task-1', 'patient-1', 30, 'ran 30 min');
    });

    it('returns null when task not found', async () => {
      const result = await service.completeTask('unknown', 'patient-1');
      expect(result).toBeNull();
    });
  });

  describe('skipTask', () => {
    it('updates status to SKIPPED for ONCE task', async () => {
      const repo = makeRepo({
        findForPatient: jest.fn().mockResolvedValue([onceTask]),
        updateStatus: jest.fn().mockResolvedValue({ ...onceTask, status: TaskStatus.SKIPPED }),
      });
      service = new TaskEngineService(repo as never);
      await service.skipTask('task-2', 'patient-1');
      expect(repo.updateStatus).toHaveBeenCalledWith('task-2', TaskStatus.SKIPPED);
    });

    it('adds SKIPPED completion for DAILY task', async () => {
      const repo = makeRepo({
        findForPatient: jest.fn().mockResolvedValue([dailyTask]),
        addCompletion: jest.fn().mockResolvedValue({}),
      });
      service = new TaskEngineService(repo as never);
      await service.skipTask('task-1', 'patient-1');
      expect(repo.addCompletion).toHaveBeenCalledWith('task-1', 'patient-1', undefined, 'SKIPPED');
    });
  });

  describe('expireOverdueTasks', () => {
    it('delegates to repo.expireOverdue', async () => {
      const repo = makeRepo({ expireOverdue: jest.fn().mockResolvedValue({ count: 3 }) });
      service = new TaskEngineService(repo as never);
      const result = await service.expireOverdueTasks();
      expect(result).toEqual({ count: 3 });
    });
  });
});
