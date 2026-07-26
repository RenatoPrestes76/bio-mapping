import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BioBookService } from './bio-book.service.js';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import {
  GenerateBioBookDto,
  BioBookResponseDto,
  BioBookTimelineResponseDto,
  BioBookChaptersResponseDto,
  BioBookSummaryResponseDto,
} from './dto/bio-book.dto.js';

@Controller('bio-book')
@UseGuards(JwtAuthGuard)
export class BioBookController {
  constructor(private readonly service: BioBookService) {}

  @Post('generate')
  generate(@Body() dto: GenerateBioBookDto): BioBookResponseDto {
    const narrative = this.service.generate(dto);
    return BioBookResponseDto.fromNarrative(narrative);
  }

  @Get('timeline/:patientId')
  getTimeline(@Param('patientId') patientId: string): BioBookTimelineResponseDto {
    const narrative = this.service.getTimeline(patientId);
    return BioBookTimelineResponseDto.fromNarrative(narrative);
  }

  @Get('chapters/:patientId')
  getChapters(@Param('patientId') patientId: string): BioBookChaptersResponseDto {
    const narrative = this.service.getChapters(patientId);
    return BioBookChaptersResponseDto.fromNarrative(narrative);
  }

  @Get('summary/:patientId')
  getSummary(@Param('patientId') patientId: string): BioBookSummaryResponseDto {
    const narrative = this.service.getSummary(patientId);
    return BioBookSummaryResponseDto.fromNarrative(narrative);
  }
}
