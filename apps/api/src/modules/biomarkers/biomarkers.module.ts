import { Module } from '@nestjs/common';
import { BiomarkersController } from './controllers/biomarkers.controller';
import { BiomarkersService } from './services/biomarkers.service';

@Module({
  controllers: [BiomarkersController],
  providers: [BiomarkersService],
})
export class BiomarkersModule {}
