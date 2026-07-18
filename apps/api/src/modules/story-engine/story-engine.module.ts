import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { StoryEngineRepository } from './repositories/story-engine.repository.js';
import { StoryEngineService } from './services/story-engine.service.js';
import { StoryEngineController } from './controllers/story-engine.controller.js';

@Module({
  imports: [DatabaseModule],
  providers: [StoryEngineRepository, StoryEngineService],
  controllers: [StoryEngineController],
})
export class StoryEngineModule {}
