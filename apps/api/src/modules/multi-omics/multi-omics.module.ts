import { Module } from '@nestjs/common';
import { MultiOmicsController } from './multi-omics.controller.js';
import { MultiOmicsService } from './multi-omics.service.js';
import { MultiOmicsProvider } from './providers/multi-omics.provider.js';

@Module({
  controllers: [MultiOmicsController],
  providers: [MultiOmicsService, MultiOmicsProvider],
  exports: [MultiOmicsService],
})
export class MultiOmicsModule {}
