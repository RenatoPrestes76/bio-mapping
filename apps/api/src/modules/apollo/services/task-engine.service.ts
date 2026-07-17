import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@bio/database';
import { TaskRepository } from '../repositories/task.repository.js';

@Injectable()
export class TaskEngineService {
  constructor(private readonly taskRepo: TaskRepository) {}

  async getTasksForToday(patientId: string, enrollmentId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await this.taskRepo.findForPatient(patientId, {
      date: today,
      enrollmentId,
    });

    // Annotate recurring tasks with today's completion status
    return Promise.all(
      tasks.map(async (task) => {
        const completedToday = task.recurrence !== 'ONCE' ? await this.taskRepo.hasCompletionToday(task.id) : false;
        return {
          ...task,
          completedToday,
          isDueToday: task.recurrence === 'DAILY' || (task.dueDate ? task.dueDate <= today : false),
        };
      }),
    );
  }

  async completeTask(taskId: string, patientId: string, value?: number, notes?: string) {
    const tasks = await this.taskRepo.findForPatient(patientId);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;

    if (task.recurrence === 'ONCE') {
      await this.taskRepo.updateStatus(taskId, TaskStatus.COMPLETED);
    } else {
      // For recurring tasks, log a completion (status stays ACTIVE)
      await this.taskRepo.addCompletion(taskId, patientId, value, notes);
    }

    return this.taskRepo.updateStatus(taskId, task.recurrence === 'ONCE' ? TaskStatus.COMPLETED : task.status as TaskStatus);
  }

  async skipTask(taskId: string, patientId: string) {
    const tasks = await this.taskRepo.findForPatient(patientId);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;

    if (task.recurrence === 'ONCE') {
      return this.taskRepo.updateStatus(taskId, TaskStatus.SKIPPED);
    }
    // For recurring tasks, just add a "skipped" completion note
    return this.taskRepo.addCompletion(taskId, patientId, undefined, 'SKIPPED');
  }

  async expireOverdueTasks() {
    return this.taskRepo.expireOverdue();
  }
}
