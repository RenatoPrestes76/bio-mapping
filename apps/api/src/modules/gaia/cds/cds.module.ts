import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CdsRepository } from './repositories/cds.repository.js';
import { AlertManagerService } from './services/alert-manager.service.js';
import { CdsService } from './services/cds.service.js';
import { CdsController } from './controllers/cds.controller.js';

@Module({
  imports: [DatabaseModule],
  providers: [CdsRepository, AlertManagerService, CdsService],
  controllers: [CdsController],
  exports: [CdsService, CdsRepository],
})
export class CdsModule {}
