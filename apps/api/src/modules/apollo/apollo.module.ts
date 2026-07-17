import { Module } from '@nestjs/common';
import { CareProgramRepository } from './repositories/care-program.repository.js';
import { EnrollmentRepository } from './repositories/enrollment.repository.js';
import { TaskRepository } from './repositories/task.repository.js';
import { MilestoneRepository } from './repositories/milestone.repository.js';
import { ClinicalNoteRepository } from './repositories/clinical-note.repository.js';
import { QuestionnaireRepository } from './repositories/questionnaire.repository.js';
import { CareProgramService } from './services/care-program.service.js';
import { EnrollmentService } from './services/enrollment.service.js';
import { TaskEngineService } from './services/task-engine.service.js';
import { MilestoneService } from './services/milestone.service.js';
import { ClinicalNoteService } from './services/clinical-note.service.js';
import { QuestionnaireService } from './services/questionnaire.service.js';
import { ApolloDashboardService } from './services/apollo-dashboard.service.js';
import { ApolloSchedulerService } from './schedulers/apollo-scheduler.service.js';
import { ApolloController } from './controllers/apollo.controller.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ApolloController],
  providers: [
    CareProgramRepository,
    EnrollmentRepository,
    TaskRepository,
    MilestoneRepository,
    ClinicalNoteRepository,
    QuestionnaireRepository,
    CareProgramService,
    EnrollmentService,
    TaskEngineService,
    MilestoneService,
    ClinicalNoteService,
    QuestionnaireService,
    ApolloDashboardService,
    ApolloSchedulerService,
  ],
  exports: [
    CareProgramService,
    EnrollmentService,
    TaskEngineService,
    MilestoneService,
    ClinicalNoteService,
    QuestionnaireService,
  ],
})
export class ApolloModule {}
