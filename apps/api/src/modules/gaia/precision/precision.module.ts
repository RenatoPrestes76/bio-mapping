import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { PrecisionRepository } from './repositories/precision.repository.js';
import { PrecisionService } from './services/precision.service.js';
import { PrecisionController } from './controllers/precision.controller.js';

@Module({
  imports: [DatabaseModule],
  providers: [PrecisionRepository, PrecisionService],
  controllers: [PrecisionController],
  exports: [PrecisionService, PrecisionRepository],
})
export class PrecisionModule {}
