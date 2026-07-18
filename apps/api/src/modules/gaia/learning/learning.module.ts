import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { LearningRepository } from './repositories/learning.repository.js';
import { LearningService } from './services/learning.service.js';
import { LearningController } from './controllers/learning.controller.js';

@Module({
  imports: [DatabaseModule],
  providers: [LearningRepository, LearningService],
  controllers: [LearningController],
  exports: [LearningService, LearningRepository],
})
export class LearningModule {}
