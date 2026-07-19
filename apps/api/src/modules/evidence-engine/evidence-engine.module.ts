import { Module } from '@nestjs/common';
import { EvidenceProvider } from './providers/evidence.provider.js';
import { EvidenceEngineService } from './evidence-engine.service.js';
import { EvidenceEngineController } from './evidence-engine.controller.js';

@Module({
  controllers: [EvidenceEngineController],
  providers: [EvidenceProvider, EvidenceEngineService],
  exports: [EvidenceEngineService, EvidenceProvider],
})
export class EvidenceEngineModule {}
