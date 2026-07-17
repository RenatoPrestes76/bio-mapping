import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../identity/auth/decorators/current-user.decorator.js';
import { InteropSyncService } from '../services/interop-sync.service.js';
import { ClinicalRecordService } from '../services/clinical-record.service.js';
import { AdapterRegistry } from '../adapters/adapter.registry.js';
import { InteropJobRepository } from '../repositories/interop-job.repository.js';
import { InteropAdapter, ClinicalRecordType, ClinicalStatus } from '@bio/database';

@UseGuards(JwtAuthGuard)
@Controller('interop')
export class InteropController {
  constructor(
    private readonly syncService: InteropSyncService,
    private readonly recordService: ClinicalRecordService,
    private readonly registry: AdapterRegistry,
    private readonly jobRepo: InteropJobRepository,
  ) {}

  @Get('status')
  getStatus() {
    return {
      adapters: this.registry.list(),
      version: '1.0.0',
      supportedFormats: ['FHIR_R4', 'JSON_GENERIC'],
      futureFormats: ['HL7_V2'],
    };
  }

  @Post('import')
  async import(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Body() body: {
      adapter: InteropAdapter;
      patientId?: string;
      organizationId?: string;
      sourceSystem?: string;
      data: unknown;
    },
  ) {
    const patientId = body.patientId ?? user.patientId ?? user.sub;
    return this.syncService.import({
      adapter: body.adapter,
      patientId,
      organizationId: body.organizationId,
      sourceSystem: body.sourceSystem,
      data: body.data,
    });
  }

  @Post('export')
  async export(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Body() body: { adapter: InteropAdapter; patientId?: string; organizationId?: string },
  ) {
    const patientId = body.patientId ?? user.patientId ?? user.sub;
    return this.syncService.export({ adapter: body.adapter, patientId, organizationId: body.organizationId });
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Query('patientId') patientId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('limit') limit?: string,
  ) {
    const pid = patientId ?? user.patientId ?? user.sub;
    if (organizationId) {
      return this.jobRepo.findByOrganization(organizationId, limit ? parseInt(limit, 10) : 50);
    }
    return this.jobRepo.findByPatient(pid, limit ? parseInt(limit, 10) : 20);
  }

  @Get('records')
  getRecords(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Query('patientId') patientId?: string,
    @Query('recordType') recordType?: ClinicalRecordType,
  ) {
    const pid = patientId ?? user.patientId ?? user.sub;
    return this.recordService.getRecords(pid, recordType);
  }

  @Get('summary')
  getSummary(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Query('patientId') patientId?: string,
  ) {
    const pid = patientId ?? user.patientId ?? user.sub;
    return this.recordService.getSummary(pid);
  }

  @Get('medications')
  getMedications(
    @CurrentUser() user: { sub: string; patientId?: string },
    @Query('status') status?: ClinicalStatus,
  ) {
    const pid = user.patientId ?? user.sub;
    return this.recordService.getMedications(pid, status);
  }

  @Get('allergies')
  getAllergies(@CurrentUser() user: { sub: string; patientId?: string }) {
    const pid = user.patientId ?? user.sub;
    return this.recordService.getAllergies(pid, ClinicalStatus.ACTIVE);
  }

  @Get('procedures')
  getProcedures(@CurrentUser() user: { sub: string; patientId?: string }) {
    const pid = user.patientId ?? user.sub;
    return this.recordService.getProcedures(pid);
  }
}
