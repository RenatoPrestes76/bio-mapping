import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BioBookService } from './bio-book.service.js';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../identity/auth/types/jwt-payload.interface.js';
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
  generate(@Body() dto: GenerateBioBookDto, @CurrentUser() user: JwtPayload): BioBookResponseDto {
    const narrative = this.service.generate(dto, user);
    return BioBookResponseDto.fromNarrative(narrative);
  }

  @Get('timeline/:patientId')
  getTimeline(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload): BioBookTimelineResponseDto {
    const narrative = this.service.getTimeline(patientId, user);
    return BioBookTimelineResponseDto.fromNarrative(narrative);
  }

  @Get('chapters/:patientId')
  getChapters(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload): BioBookChaptersResponseDto {
    const narrative = this.service.getChapters(patientId, user);
    return BioBookChaptersResponseDto.fromNarrative(narrative);
  }

  @Get('summary/:patientId')
  getSummary(@Param('patientId') patientId: string, @CurrentUser() user: JwtPayload): BioBookSummaryResponseDto {
    const narrative = this.service.getSummary(patientId, user);
    return BioBookSummaryResponseDto.fromNarrative(narrative);
  }
}
