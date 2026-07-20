import { Module } from '@nestjs/common';
import { PharmacogenomicsProvider } from './providers/pharmacogenomics.provider.js';
import { PharmacogenomicsService } from './pharmacogenomics.service.js';
import { PharmacogenomicsController } from './pharmacogenomics.controller.js';

@Module({
  providers: [PharmacogenomicsProvider, PharmacogenomicsService],
  controllers: [PharmacogenomicsController],
  exports: [PharmacogenomicsService],
})
export class PharmacogenomicsModule {}
