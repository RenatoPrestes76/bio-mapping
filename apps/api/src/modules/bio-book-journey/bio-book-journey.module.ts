import { Module } from '@nestjs/common';
import { BioBookModule } from '../bio-book/bio-book.module.js';
import { BioBookInsightModule } from '../bio-book-insight/bio-book-insight.module.js';
import { BioBookJourneyController } from './bio-book-journey.controller.js';
import { BioBookJourneyProvider } from './providers/bio-book-journey.provider.js';
import { BioBookJourneyService } from './bio-book-journey.service.js';

@Module({
  imports: [BioBookModule, BioBookInsightModule],
  controllers: [BioBookJourneyController],
  providers: [BioBookJourneyProvider, BioBookJourneyService],
  exports: [BioBookJourneyService],
})
export class BioBookJourneyModule {}
