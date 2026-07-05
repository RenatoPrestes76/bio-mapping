import { Module } from '@nestjs/common';
import { ScoringService } from './services/scoring.service';

@Module({
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
