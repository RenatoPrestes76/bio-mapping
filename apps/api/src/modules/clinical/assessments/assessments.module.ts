import { Module } from '@nestjs/common';
import { AssessmentsService } from './services/assessments.service';
import { AssessmentsController } from './controllers/assessments.controller';
import { AssessmentsRepository } from './repositories/assessments.repository';
import { DatabaseModule } from '../../../database/database.module';
import { AuditLogModule } from '../../../common/audit/audit-log.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [DatabaseModule, AuditLogModule, ScoringModule],
  providers: [AssessmentsService, AssessmentsRepository],
  controllers: [AssessmentsController],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
