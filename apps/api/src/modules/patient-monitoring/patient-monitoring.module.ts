import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PatientMonitoringController } from './controllers/patient-monitoring.controller.js';
import { PatientMonitoringService } from './services/patient-monitoring.service.js';
import { PrismaPatientTimelineRepository } from './repositories/prisma-patient-timeline.repository.js';
import { TimelineAggregator } from './aggregators/timeline-aggregator.js';

@Module({
  imports: [DatabaseModule],
  controllers: [PatientMonitoringController],
  providers: [PatientMonitoringService, TimelineAggregator, PrismaPatientTimelineRepository],
})
export class PatientMonitoringModule {}
