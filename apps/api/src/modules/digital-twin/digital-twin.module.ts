import { Module } from '@nestjs/common';
import { DigitalTwinController } from './digital-twin.controller.js';
import { DigitalTwinService } from './digital-twin.service.js';
import { DigitalTwinProvider } from './providers/digital-twin.provider.js';

@Module({
  controllers: [DigitalTwinController],
  providers: [DigitalTwinService, DigitalTwinProvider],
  exports: [DigitalTwinService],
})
export class DigitalTwinModule {}
