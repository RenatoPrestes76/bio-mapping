import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { SimulationRepository } from './repositories/simulation.repository.js';
import { SimulationService } from './services/simulation.service.js';
import { SimulationController } from './controllers/simulation.controller.js';

@Module({
  imports: [DatabaseModule],
  providers: [SimulationRepository, SimulationService],
  controllers: [SimulationController],
  exports: [SimulationService, SimulationRepository],
})
export class SimulationModule {}
