import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { BioTeamsRepository } from './repositories/bioteams.repository.js';
import { BioTeamsService } from './services/bioteams.service.js';
import { BioTeamsController } from './controllers/bioteams.controller.js';

@Module({
  imports: [DatabaseModule],
  providers: [BioTeamsRepository, BioTeamsService],
  controllers: [BioTeamsController],
  exports: [BioTeamsService, BioTeamsRepository],
})
export class BioTeamsModule {}
