import { Module } from '@nestjs/common';
import { LongitudinalHealthController } from './longitudinal-health.controller.js';
import { LongitudinalHealthService } from './longitudinal-health.service.js';
import { LongitudinalHealthProvider } from './providers/longitudinal-health.provider.js';

@Module({
  controllers: [LongitudinalHealthController],
  providers: [LongitudinalHealthProvider, LongitudinalHealthService],
  exports: [LongitudinalHealthService],
})
export class LongitudinalHealthModule {}
