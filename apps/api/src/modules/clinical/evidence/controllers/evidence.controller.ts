import {
  Controller, Delete, Get, Param, Post, Req, UploadedFile,
  UseGuards, UseInterceptors, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../identity/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../identity/auth/guards/roles.guard';
import { CurrentUser } from '../../../identity/auth/decorators/current-user.decorator';
import { EvidenceService } from '../services/evidence.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assessments/:assessmentId/evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  upload(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.evidenceService.upload(assessmentId, file, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Get()
  findAll(@Param('assessmentId', ParseUUIDPipe) assessmentId: string, @CurrentUser() user: any) {
    return this.evidenceService.findAll(assessmentId, user);
  }

  @Delete(':evidenceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Param('evidenceId', ParseUUIDPipe) evidenceId: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.evidenceService.remove(assessmentId, evidenceId, user, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }
}
