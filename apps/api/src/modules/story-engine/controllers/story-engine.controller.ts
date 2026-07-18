import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { StoryEngineService } from '../services/story-engine.service.js';
import { UpdateChapterDto } from '../dto/update-chapter.dto.js';
import { ShareChapterDto } from '../dto/share-chapter.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('story-engine')
export class StoryEngineController {
  constructor(private readonly service: StoryEngineService) {}

  @Post('generate')
  generate(@CurrentUser() user: { sub: string }) {
    return this.service.generate(user.sub, user.sub);
  }

  @Get('chapters')
  findAll(@CurrentUser() user: { sub: string }) {
    return this.service.findByUser(user.sub);
  }

  @Get('timeline')
  getTimeline(@CurrentUser() user: { sub: string }) {
    return this.service.getTimeline(user.sub);
  }

  @Get('shared')
  getShared(@CurrentUser() user: { sub: string }) {
    return this.service.findSharedWith(user.sub);
  }

  @Get('chapters/:id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('chapters/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChapterDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Post('chapters/:id/share')
  share(
    @Param('id') id: string,
    @Body() dto: ShareChapterDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.share(id, dto, user.sub);
  }
}
