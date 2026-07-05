import { Module } from '@nestjs/common';
import { TemplatesService } from './services/templates.service';
import { TemplatesController } from './controllers/templates.controller';
import { DatabaseModule } from '../../../database/database.module';
import { AuditLogModule } from '../../../common/audit/audit-log.module';

@Module({
  imports: [DatabaseModule, AuditLogModule],
  providers: [TemplatesService],
  controllers: [TemplatesController],
  exports: [TemplatesService],
})
export class TemplatesModule {}
