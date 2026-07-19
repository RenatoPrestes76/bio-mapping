import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator.js';
import { DigitalTwinService } from './digital-twin.service.js';
import {
  CreateTwinDto,
  SimulateScenarioDto,
  ForecastDto,
  CompareDto,
} from './dto/twin.dto.js';

@Controller('digital-twin')
@UseGuards(JwtAuthGuard)
export class DigitalTwinController {
  constructor(private readonly service: DigitalTwinService) {}

  @Post()
  buildTwin(@Body() dto: CreateTwinDto, @CurrentUser() _user: { sub: string }) {
    return this.service.buildTwin(dto);
  }

  @Post('simulate')
  simulateScenario(
    @Body() dto: SimulateScenarioDto,
    @CurrentUser() _user: { sub: string },
  ) {
    return this.service.simulateScenario(dto);
  }

  @Post('forecast')
  forecastEvolution(
    @Body() dto: ForecastDto,
    @CurrentUser() _user: { sub: string },
  ) {
    return this.service.forecastEvolution(dto);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getTimeline(id);
  }

  @Get(':id/snapshots')
  getSnapshots(@Param('id') id: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getSnapshots(id);
  }

  @Post(':id/compare')
  compare(
    @Param('id') id: string,
    @Body() dto: CompareDto,
    @CurrentUser() _user: { sub: string },
  ) {
    return this.service.compare(id, dto);
  }

  @Get(':id')
  getTwin(@Param('id') id: string, @CurrentUser() _user: { sub: string }) {
    return this.service.getTwin(id);
  }
}
