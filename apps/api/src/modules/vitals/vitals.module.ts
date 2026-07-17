import { Module } from '@nestjs/common';
import { VitalsController } from './controllers/vitals.controller';
import { VitalsService } from './services/vitals.service';
import { VitalCalculationsService } from './services/vital-calculations.service';
import { VitalsRepository } from './repositories/vitals.repository';

@Module({
  controllers: [VitalsController],
  providers: [VitalsService, VitalCalculationsService, VitalsRepository],
  exports: [VitalCalculationsService, VitalsRepository],
})
export class VitalsModule {}
