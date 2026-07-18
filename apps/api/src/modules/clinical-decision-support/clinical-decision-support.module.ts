import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { ClinicalKnowledgeModule } from '../clinical-knowledge/clinical-knowledge.module.js';
import { PrismaClinicalDecisionRepository } from './repositories/prisma-clinical-decision.repository.js';
import { ClinicalDecisionSupportService } from './services/clinical-decision-support.service.js';
import { ClinicalDecisionSupportController } from './controllers/clinical-decision-support.controller.js';

@Module({
  imports: [DatabaseModule, ClinicalKnowledgeModule],
  controllers: [ClinicalDecisionSupportController],
  providers: [PrismaClinicalDecisionRepository, ClinicalDecisionSupportService],
  exports: [ClinicalDecisionSupportService],
})
export class ClinicalDecisionSupportModule {}
