import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EnrollmentStatus } from '@bio/database';
import { EnrollmentRepository } from '../repositories/enrollment.repository.js';
import { TaskEngineService } from '../services/task-engine.service.js';
import { MilestoneService } from '../services/milestone.service.js';
import { EnrollmentService } from '../services/enrollment.service.js';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class ApolloSchedulerService {
  private readonly logger = new Logger(ApolloSchedulerService.name);

  constructor(
    private readonly enrollmentRepo: EnrollmentRepository,
    private readonly taskEngine: TaskEngineService,
    private readonly milestoneService: MilestoneService,
    private readonly enrollmentService: EnrollmentService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron('0 6 * * *')
  async expireOverdueTasks() {
    this.logger.log('APOLLO: expiring overdue tasks');
    const count = await this.taskEngine.expireOverdueTasks();
    this.logger.log(`APOLLO: expired ${count} overdue tasks`);
  }

  @Cron('30 6 * * *')
  async checkMilestonesForAllPatients() {
    this.logger.log('APOLLO: checking milestones for all active patients');
    const patientIds = await this.getActivePatientsIds();
    let total = 0;
    for (const patientId of patientIds) {
      const achieved = await this.milestoneService.checkAndUpdateMilestones(patientId);
      total += achieved;
    }
    this.logger.log(`APOLLO: achieved ${total} milestones`);
  }

  @Cron('0 7 * * *')
  async updateAdherenceForAllEnrollments() {
    this.logger.log('APOLLO: updating adherence for all active enrollments');
    const enrollments = await this.enrollmentRepo.findActive();
    for (const enrollment of enrollments) {
      await this.enrollmentService.calculateAdherence(enrollment.id);
    }
    this.logger.log(`APOLLO: updated adherence for ${enrollments.length} enrollments`);
  }

  async runAllForEnrollment(enrollmentId: string) {
    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) return;
    await this.milestoneService.checkAndUpdateMilestones(enrollment.patientId);
    await this.enrollmentService.calculateAdherence(enrollmentId);
  }

  private async getActivePatientsIds(): Promise<string[]> {
    const enrollments = await this.enrollmentRepo.findActive();
    return [...new Set(enrollments.map((e) => e.patientId))];
  }
}
