import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { PopulationRepository } from './repositories/population.repository.js';
import { PopulationService } from './services/population.service.js';
import { CohortController } from './controllers/cohort.controller.js';
import { PopulationController } from './controllers/population.controller.js';

@Module({
  imports: [DatabaseModule],
  providers: [PopulationRepository, PopulationService],
  controllers: [CohortController, PopulationController],
  exports: [PopulationService, PopulationRepository],
})
export class PopulationModule {}
