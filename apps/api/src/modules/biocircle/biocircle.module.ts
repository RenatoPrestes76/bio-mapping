import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { BioCircleRepository } from './repositories/biocircle.repository.js';
import { BioCircleNotificationService } from './notifications/biocircle-notification.service.js';
import { BioCircleService } from './services/biocircle.service.js';
import { BioCircleController } from './controllers/biocircle.controller.js';

@Module({
  imports: [DatabaseModule],
  providers: [BioCircleRepository, BioCircleNotificationService, BioCircleService],
  controllers: [BioCircleController],
  exports: [BioCircleService, BioCircleRepository],
})
export class BioCircleModule {}
