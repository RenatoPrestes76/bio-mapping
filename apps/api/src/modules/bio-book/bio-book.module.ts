import { Module } from '@nestjs/common';
import { BioBookController } from './bio-book.controller.js';
import { BioBookProvider } from './providers/bio-book.provider.js';
import { BioBookService } from './bio-book.service.js';

@Module({
  controllers: [BioBookController],
  providers: [BioBookProvider, BioBookService],
  exports: [BioBookService],
})
export class BioBookModule {}
