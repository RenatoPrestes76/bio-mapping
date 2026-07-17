import { Injectable } from '@nestjs/common';
import { EnrollmentStatus, MilestoneStatus, TaskStatus } from '@bio/database';
import { EnrollmentRepository } from '../repositories/enrollment.repository.js';
import { MilestoneRepository } from '../repositories/milestone.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { ClinicalNoteRepository } from '../repositories/clinical-note.repository.js';

@Injectable()
export class ApolloDashboardService {
  constructor(
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly milestoneRepo: MilestoneRepository,
    private readonly taskRepo: TaskRepository,
    private readonly noteRepo: ClinicalNoteRepository,
  ) {}

  async getDashboard(patientId: string) {
    const [enrollments, allMilestones, pendingTasks, recentNotes] = await Promise.all([
      this.enrollmentRepo.findByPatient(patientId, EnrollmentStatus.ACTIVE),
      this.milestoneRepo.findByPatient(patientId),
      this.taskRepo.findForPatient(patientId, { status: TaskStatus.ACTIVE }),
      this.noteRepo.findByPatient(patientId),
    ]);

    const currentEnrollment = enrollments[0] ?? null;
    const upcomingMilestones = allMilestones
      .filter((m) => m.status !== MilestoneStatus.ACHIEVED)
      .sort((a, b) => a.order - b.order)
      .slice(0, 3);

    const achievedMilestones = allMilestones.filter((m) => m.status === MilestoneStatus.ACHIEVED);

    const totalMilestones = allMilestones.length;
    const overallProgress = totalMilestones > 0
      ? Math.round((achievedMilestones.length / totalMilestones) * 100)
      : 0;

    return {
      currentEnrollment: currentEnrollment
        ? {
            id: currentEnrollment.id,
            programName: (currentEnrollment as { program?: { name: string } }).program?.name ?? '',
            status: currentEnrollment.status,
            progressPct: currentEnrollment.progressPct,
            adherencePct: currentEnrollment.adherencePct,
            currentPhase: currentEnrollment.currentPhase,
            startDate: currentEnrollment.startDate,
            expectedEndDate: currentEnrollment.expectedEndDate,
          }
        : null,
      pendingTasks: pendingTasks.slice(0, 5),
      upcomingMilestones,
      achievedMilestones: achievedMilestones.slice(0, 5),
      overallProgress,
      totalMilestones,
      achievedCount: achievedMilestones.length,
      recentNotes: recentNotes.slice(0, 3),
      activeEnrollmentsCount: enrollments.length,
    };
  }
}
