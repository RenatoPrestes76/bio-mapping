import { Module } from '@nestjs/common';
import { ScoringModule } from './scoring/scoring.module';
import { TemplatesModule } from './templates/templates.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { EvidenceModule } from './evidence/evidence.module';

@Module({
  imports: [ScoringModule, TemplatesModule, AssessmentsModule, EvidenceModule],
  exports: [ScoringModule, TemplatesModule, AssessmentsModule, EvidenceModule],
})
export class ClinicalModule {}
