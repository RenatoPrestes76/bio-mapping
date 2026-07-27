import { Module } from '@nestjs/common';
import { BioBookModule } from '../bio-book/bio-book.module.js';
import { BioBookInsightController } from './bio-book-insight.controller.js';
import { BioBookInsightProvider } from './providers/bio-book-insight.provider.js';
import { BioBookInsightService } from './bio-book-insight.service.js';

@Module({
  imports: [BioBookModule],
  controllers: [BioBookInsightController],
  providers: [BioBookInsightProvider, BioBookInsightService],
  exports: [BioBookInsightService],
})
export class BioBookInsightModule {}
