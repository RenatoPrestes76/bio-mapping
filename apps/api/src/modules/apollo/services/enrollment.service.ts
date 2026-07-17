import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, MilestoneStatus, TaskRecurrence, TaskStatus } from '@bio/database';
import { EnrollmentRepository } from '../repositories/enrollment.repository.js';
import { MilestoneRepository } from '../repositories/milestone.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { CareProgramRepository } from '../repositories/care-program.repository.js';

const DEFAULT_MILESTONES_BY_CATEGORY: Record<string, Array<{ title: string; metric?: string; targetValue?: number; unit?: string; order: number; daysFromStart?: number }>> = {
  WEIGHT_LOSS: [
    { title: 'Perder os primeiros 2 kg', metric: 'weight', targetValue: -2, unit: 'kg', order: 1, daysFromStart: 30 },
    { title: 'Perder 5 kg no total', metric: 'weight', targetValue: -5, unit: 'kg', order: 2, daysFromStart: 60 },
    { title: 'Atingir meta de peso', metric: 'weight', order: 3, daysFromStart: 90 },
  ],
  RUNNING_5K: [
    { title: 'Completar primeira corrida de 1 km sem parar', order: 1, daysFromStart: 14 },
    { title: 'Completar 3 km contínuos', order: 2, daysFromStart: 30 },
    { title: 'Completar 5 km', order: 3, daysFromStart: 60 },
  ],
  RUNNING_10K: [
    { title: 'Completar 5 km em menos de 35 minutos', order: 1, daysFromStart: 21 },
    { title: 'Completar 8 km', order: 2, daysFromStart: 45 },
    { title: 'Completar 10 km', order: 3, daysFromStart: 90 },
  ],
  HYPERTENSION: [
    { title: 'Pressão sistólica < 140 mmHg consistentemente', metric: 'bloodPressureSystolic', targetValue: 140, unit: 'mmHg', order: 1, daysFromStart: 30 },
    { title: 'Pressão normalizada (< 130/80)', metric: 'bloodPressureSystolic', targetValue: 130, unit: 'mmHg', order: 2, daysFromStart: 90 },
  ],
  REHABILITATION: [
    { title: 'Completar avaliação funcional inicial', order: 1, daysFromStart: 7 },
    { title: 'Retorno às atividades de vida diária', order: 2, daysFromStart: 30 },
    { title: 'Alta da reabilitação', order: 3, daysFromStart: 90 },
  ],
};

const DEFAULT_TASKS_BY_CATEGORY: Record<string, Array<{ title: string; category: string; recurrence: TaskRecurrence; priority: string }>> = {
  WEIGHT_LOSS: [
    { title: 'Registrar peso', category: 'MEASUREMENT', recurrence: TaskRecurrence.DAILY, priority: 'MEDIUM' },
    { title: 'Beber 2L de água', category: 'HYDRATION', recurrence: TaskRecurrence.DAILY, priority: 'HIGH' },
    { title: 'Realizar atividade física', category: 'EXERCISE', recurrence: TaskRecurrence.DAILY, priority: 'HIGH' },
  ],
  HYPERTENSION: [
    { title: 'Medir pressão arterial', category: 'MEASUREMENT', recurrence: TaskRecurrence.DAILY, priority: 'CRITICAL' },
    { title: 'Tomar medicação', category: 'MEDICATION', recurrence: TaskRecurrence.DAILY, priority: 'CRITICAL' },
    { title: 'Caminhada de 30 minutos', category: 'EXERCISE', recurrence: TaskRecurrence.DAILY, priority: 'MEDIUM' },
  ],
  RUNNING_5K: [
    { title: 'Realizar treino do programa', category: 'EXERCISE', recurrence: TaskRecurrence.DAILY, priority: 'HIGH' },
    { title: 'Registrar distância percorrida', category: 'MEASUREMENT', recurrence: TaskRecurrence.DAILY, priority: 'MEDIUM' },
    { title: 'Hidratação pós-treino', category: 'HYDRATION', recurrence: TaskRecurrence.DAILY, priority: 'MEDIUM' },
  ],
  RUNNING_10K: [
    { title: 'Realizar treino do programa', category: 'EXERCISE', recurrence: TaskRecurrence.DAILY, priority: 'HIGH' },
    { title: 'Registrar distância e pace', category: 'MEASUREMENT', recurrence: TaskRecurrence.DAILY, priority: 'MEDIUM' },
  ],
  DEFAULT: [
    { title: 'Check-in diário', category: 'CHECK_IN', recurrence: TaskRecurrence.DAILY, priority: 'MEDIUM' },
    { title: 'Beber 2L de água', category: 'HYDRATION', recurrence: TaskRecurrence.DAILY, priority: 'MEDIUM' },
  ],
};

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly milestoneRepo: MilestoneRepository,
    private readonly taskRepo: TaskRepository,
    private readonly programRepo: CareProgramRepository,
  ) {}

  async enroll(data: {
    programId: string;
    patientId: string;
    professionalId?: string;
    notes?: string;
  }) {
    const program = await this.programRepo.findById(data.programId);
    if (!program) throw new NotFoundException(`Program ${data.programId} not found`);

    const existing = await this.enrollmentRepo.findByPatient(data.patientId, EnrollmentStatus.ACTIVE);
    if (existing.some((e) => e.programId === data.programId)) {
      throw new BadRequestException('Patient already has an active enrollment in this program');
    }

    const startDate = new Date();
    const expectedEndDate = program.durationDays
      ? new Date(Date.now() + program.durationDays * 86400 * 1000)
      : undefined;

    const enrollment = await this.enrollmentRepo.create({ ...data, startDate, expectedEndDate });

    // Create milestones
    const milestoneTemplates = DEFAULT_MILESTONES_BY_CATEGORY[program.category] ?? [];
    if (milestoneTemplates.length > 0) {
      await this.milestoneRepo.createMany(
        milestoneTemplates.map((m) => ({
          enrollmentId: enrollment.id,
          patientId: data.patientId,
          title: m.title,
          metric: m.metric,
          targetValue: m.targetValue,
          unit: m.unit,
          order: m.order,
          dueDate: m.daysFromStart ? new Date(Date.now() + m.daysFromStart * 86400 * 1000) : undefined,
        })),
      );
    }

    // Create daily tasks
    const taskTemplates = DEFAULT_TASKS_BY_CATEGORY[program.category] ?? DEFAULT_TASKS_BY_CATEGORY.DEFAULT;
    await this.taskRepo.createMany(
      taskTemplates.map((t) => ({
        patientId: data.patientId,
        enrollmentId: enrollment.id,
        programId: data.programId,
        title: t.title,
        category: t.category,
        recurrence: t.recurrence,
        priority: t.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        status: TaskStatus.ACTIVE,
      })),
    );

    return enrollment;
  }

  async getEnrollments(patientId: string, status?: EnrollmentStatus) {
    return this.enrollmentRepo.findByPatient(patientId, status);
  }

  async getEnrollment(id: string) {
    const enrollment = await this.enrollmentRepo.findById(id);
    if (!enrollment) throw new NotFoundException(`Enrollment ${id} not found`);
    return enrollment;
  }

  async updateStatus(id: string, status: EnrollmentStatus) {
    const now = new Date();
    const timestamps: Record<string, Date> = {};
    if (status === EnrollmentStatus.COMPLETED) timestamps['completedAt'] = now;
    if (status === EnrollmentStatus.PAUSED) timestamps['pausedAt'] = now;
    if (status === EnrollmentStatus.CANCELLED) timestamps['cancelledAt'] = now;
    return this.enrollmentRepo.update(id, { status, ...timestamps as Parameters<typeof this.enrollmentRepo.update>[1] });
  }

  async calculateAdherence(enrollmentId: string): Promise<number> {
    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) return 0;

    const daysSinceStart = Math.max(1, Math.floor((Date.now() - enrollment.startDate.getTime()) / 86400000));
    const windowDays = Math.min(daysSinceStart, 30);
    const from = new Date(Date.now() - windowDays * 86400000);
    const to = new Date();

    const [dailyTaskCount, completions] = await Promise.all([
      this.taskRepo.findTemplatesForEnrollment(enrollmentId).then((tasks) =>
        tasks.filter((t) => t.recurrence === TaskRecurrence.DAILY).length,
      ),
      this.taskRepo.countCompletionsInRange(enrollmentId, from, to),
    ]);

    const expectedCompletions = dailyTaskCount * windowDays;
    if (expectedCompletions === 0) return 0;
    return Math.min(100, Math.round((completions / expectedCompletions) * 100 * 10) / 10);
  }
}
