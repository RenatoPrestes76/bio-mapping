import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EvidenceService } from './services/evidence.service';
import { EvidenceController } from './controllers/evidence.controller';
import { LocalEvidenceProvider } from './providers/local-evidence.provider';
import { EVIDENCE_STORAGE } from './providers/storage.interface';
import { DatabaseModule } from '../../../database/database.module';
import { AuditLogModule } from '../../../common/audit/audit-log.module';

@Module({
  imports: [
    DatabaseModule,
    AuditLogModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  providers: [
    EvidenceService,
    { provide: EVIDENCE_STORAGE, useClass: LocalEvidenceProvider },
  ],
  controllers: [EvidenceController],
  exports: [EvidenceService],
})
export class EvidenceModule {}
