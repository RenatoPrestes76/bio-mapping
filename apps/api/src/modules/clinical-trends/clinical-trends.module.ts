import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { ClinicalTrendsController } from './controllers/clinical-trends.controller.js';
import { ClinicalTrendsService } from './services/clinical-trends.service.js';
import { PrismaClinicalTrendRepository } from './repositories/prisma-clinical-trend.repository.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ClinicalTrendsController],
  providers: [ClinicalTrendsService, PrismaClinicalTrendRepository],
  exports: [ClinicalTrendsService],
})
export class ClinicalTrendsModule {}
