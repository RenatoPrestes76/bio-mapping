import { Module } from '@nestjs/common';
import { GenomicInterpretationController } from './genomic-interpretation.controller.js';
import { GenomicInterpretationService } from './genomic-interpretation.service.js';
import { GenomicInterpretationProvider } from './providers/genomic-interpretation.provider.js';

@Module({
  controllers: [GenomicInterpretationController],
  providers: [GenomicInterpretationService, GenomicInterpretationProvider],
  exports: [GenomicInterpretationService],
})
export class GenomicInterpretationModule {}
