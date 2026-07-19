import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PrismaClinicalKnowledgeRepository } from './repositories/prisma-clinical-knowledge.repository.js';
import { ClinicalKnowledgeService } from './services/clinical-knowledge.service.js';
import { ClinicalKnowledgeController } from './controllers/clinical-knowledge.controller.js';
import { KnowledgeProvider } from './providers/knowledge.provider.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ClinicalKnowledgeController],
  providers: [PrismaClinicalKnowledgeRepository, KnowledgeProvider, ClinicalKnowledgeService],
  exports: [ClinicalKnowledgeService, KnowledgeProvider],
})
export class ClinicalKnowledgeModule {}
