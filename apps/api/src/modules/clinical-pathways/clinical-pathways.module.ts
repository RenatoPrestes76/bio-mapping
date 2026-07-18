import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PrismaClinicalPathwayRepository } from './repositories/prisma-clinical-pathway.repository.js';
import { ClinicalPathwayService } from './services/clinical-pathway.service.js';
import { ClinicalPathwayController } from './controllers/clinical-pathway.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ClinicalPathwayController],
  providers: [PrismaClinicalPathwayRepository, ClinicalPathwayService],
  exports: [ClinicalPathwayService],
})
export class ClinicalPathwaysModule {}
