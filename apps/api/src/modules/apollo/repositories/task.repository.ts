import { Injectable } from '@nestjs/common';
import { TaskPriority, TaskRecurrence, TaskStatus } from '@bio/database';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    patientId: string;
    enrollmentId?: string;
    programId?: string;
    title: string;
    description?: string;
    category?: string;
    recurrence: TaskRecurrence;
    priority?: TaskPriority;
    isTemplate?: boolean;
    dueDate?: Date;
    notes?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.task.create({ data: data as Parameters<typeof this.prisma.task.create>[0]['data'] });
  }

  async createMany(tasks: Array<Parameters<TaskRepository['create']>[0]>) {
    return Promise.all(tasks.map((t) => this.create(t)));
  }

  async findForPatient(patientId: string, filters: { date?: Date; status?: TaskStatus; enrollmentId?: string } = {}) {
    const where: Record<string, unknown> = { patientId, isTemplate: false };
    if (filters.status) where['status'] = filters.status;
    if (filters.enrollmentId) where['enrollmentId'] = filters.enrollmentId;
    if (filters.date) {
      where['OR'] = [
        { recurrence: TaskRecurrence.DAILY, status: TaskStatus.ACTIVE },
        { recurrence: TaskRecurrence.ONCE, dueDate: filters.date, status: TaskStatus.PENDING },
      ];
    }
    return this.prisma.task.findMany({
      where: where as Parameters<typeof this.prisma.task.findMany>[0]['where'],
      include: { completions: { orderBy: { completedAt: 'desc' }, take: 1 } },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async findTemplatesForEnrollment(enrollmentId: string) {
    return this.prisma.task.findMany({
      where: { enrollmentId, isTemplate: false },
    });
  }

  async updateStatus(id: string, status: TaskStatus) {
    const timestamps: Record<string, Date> = {};
    if (status === TaskStatus.COMPLETED) timestamps['completedAt'] = new Date();
    if (status === TaskStatus.SKIPPED) timestamps['skippedAt'] = new Date();
    return this.prisma.task.update({ where: { id }, data: { status, ...timestamps } as Parameters<typeof this.prisma.task.update>[0]['data'] });
  }

  async addCompletion(taskId: string, patientId: string, value?: number, notes?: string) {
    return this.prisma.taskCompletion.create({ data: { taskId, patientId, value, notes } });
  }

  async hasCompletionToday(taskId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await this.prisma.taskCompletion.count({
      where: { taskId, completedAt: { gte: today } },
    });
    return count > 0;
  }

  async countCompletionsInRange(enrollmentId: string, from: Date, to: Date) {
    const tasks = await this.prisma.task.findMany({ where: { enrollmentId, isTemplate: false }, select: { id: true } });
    const taskIds = tasks.map((t) => t.id);
    return this.prisma.taskCompletion.count({
      where: { taskId: { in: taskIds }, completedAt: { gte: from, lte: to } },
    });
  }

  async expireOverdue() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.prisma.task.updateMany({
      where: { status: TaskStatus.PENDING, dueDate: { lt: yesterday } },
      data: { status: TaskStatus.EXPIRED },
    });
  }
}
