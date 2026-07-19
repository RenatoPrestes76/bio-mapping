import { Module } from '@nestjs/common';
import { ClinicalReasoningProvider } from './providers/clinical-reasoning.provider.js';
import { ClinicalReasoningService } from './clinical-reasoning.service.js';
import { ClinicalReasoningController } from './clinical-reasoning.controller.js';

@Module({
  controllers: [ClinicalReasoningController],
  providers: [ClinicalReasoningProvider, ClinicalReasoningService],
  exports: [ClinicalReasoningService, ClinicalReasoningProvider],
})
export class ClinicalReasoningModule {}
