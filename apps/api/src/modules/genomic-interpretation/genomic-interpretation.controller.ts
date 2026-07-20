import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator.js';
import { GenomicInterpretationService } from './genomic-interpretation.service.js';
import { AnalyzeVariantDto, AnnotateVariantDto, ClassifyVariantDto } from './dto/genomics.dto.js';

@Controller('genomics')
@UseGuards(JwtAuthGuard)
export class GenomicInterpretationController {
  constructor(private readonly service: GenomicInterpretationService) {}

  @Post('variant')
  analyzeVariant(@Body() dto: AnalyzeVariantDto, @CurrentUser() user: { sub: string }) {
    return this.service.analyzeVariant(dto, user.sub);
  }

  @Post('annotate')
  annotate(@Body() dto: AnnotateVariantDto, @CurrentUser() user: { sub: string }) {
    return this.service.annotate(dto);
  }

  @Post('classify')
  classify(@Body() dto: ClassifyVariantDto, @CurrentUser() user: { sub: string }) {
    return this.service.classify(dto);
  }

  @Get('gene/:symbol')
  getGene(@Param('symbol') symbol: string, @CurrentUser() user: { sub: string }) {
    const gene = this.service.findGene(symbol);
    const conditions = this.service.findAssociatedConditions(symbol);
    return { gene, associatedConditions: conditions };
  }

  @Get('variant/:id')
  getVariant(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.service.getVariant(id);
  }

  @Get('report/:patientId')
  getReport(@Param('patientId') patientId: string, @CurrentUser() user: { sub: string }) {
    return this.service.generateReport(patientId);
  }
}
