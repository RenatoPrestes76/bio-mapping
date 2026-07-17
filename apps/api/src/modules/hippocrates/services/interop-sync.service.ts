import { Injectable } from '@nestjs/common';
import { InteropAdapter, InteropDirection } from '@bio/database';
import { AdapterRegistry } from '../adapters/adapter.registry.js';
import { ConflictResolverService } from './conflict-resolver.service.js';
import { InteropJobRepository } from '../repositories/interop-job.repository.js';
import { MedicationRepository } from '../repositories/medication.repository.js';
import { AllergyRepository } from '../repositories/allergy.repository.js';
import { ProcedureRepository } from '../repositories/procedure.repository.js';
import { ClinicalRecordRepository } from '../repositories/clinical-record.repository.js';
import { AdapterContext } from '../models/canonical.types.js';

export interface ImportDto {
  adapter: InteropAdapter;
  patientId: string;
  organizationId?: string;
  sourceSystem?: string;
  data: unknown;
}

export interface ExportDto {
  adapter: InteropAdapter;
  patientId: string;
  organizationId?: string;
}

@Injectable()
export class InteropSyncService {
  constructor(
    private readonly registry: AdapterRegistry,
    private readonly conflictResolver: ConflictResolverService,
    private readonly jobRepo: InteropJobRepository,
    private readonly medicationRepo: MedicationRepository,
    private readonly allergyRepo: AllergyRepository,
    private readonly procedureRepo: ProcedureRepository,
    private readonly recordRepo: ClinicalRecordRepository,
  ) {}

  async import(dto: ImportDto) {
    const job = await this.jobRepo.create({
      direction: InteropDirection.IMPORT,
      adapter: dto.adapter,
      patientId: dto.patientId,
      organizationId: dto.organizationId,
      sourceSystem: dto.sourceSystem,
    });

    await this.jobRepo.start(job.id);
    await this.jobRepo.addLog(job.id, 'info', `Starting import via ${dto.adapter}`);

    const adapterCtx: AdapterContext = {
      patientId: dto.patientId,
      organizationId: dto.organizationId,
      sourceSystem: dto.sourceSystem,
    };

    let processedRecords = 0;
    let failedRecords = 0;
    let conflictsFound = 0;

    try {
      const adapterInstance = this.registry.get(dto.adapter);
      const payload = await adapterInstance.import(dto.data, adapterCtx);

      const totalRecords = payload.records.length + payload.medications.length + payload.allergies.length + payload.procedures.length;
      await this.jobRepo.addLog(job.id, 'info', `Parsed ${totalRecords} items from source`);

      for (const record of payload.records) {
        try {
          const result = await this.conflictResolver.resolveAndSave(dto.patientId, record, {
            sourceSystem: dto.sourceSystem,
            organizationId: dto.organizationId,
            importedVia: dto.adapter,
          });
          processedRecords++;
          if (result.resolution === 'CONFLICT') {
            conflictsFound++;
            await this.jobRepo.addLog(job.id, 'warn', `Conflict on record ${result.recordId}: checksum changed`, result.conflictDetails);
          }
        } catch (err) {
          failedRecords++;
          await this.jobRepo.addLog(job.id, 'error', `Failed to save clinical record: ${(err as Error).message}`);
        }
      }

      for (const med of payload.medications) {
        try {
          if (med.sourceId && dto.sourceSystem) {
            await this.medicationRepo.upsertBySource(dto.patientId, dto.sourceSystem, med.sourceId, med);
          } else {
            await this.medicationRepo.create({ patientId: dto.patientId, ...med });
          }
          processedRecords++;
        } catch (err) {
          failedRecords++;
          await this.jobRepo.addLog(job.id, 'error', `Failed to save medication: ${(err as Error).message}`);
        }
      }

      for (const allergy of payload.allergies) {
        try {
          if (allergy.sourceId && dto.sourceSystem) {
            await this.allergyRepo.upsertBySource(dto.patientId, dto.sourceSystem, allergy.sourceId, allergy);
          } else {
            await this.allergyRepo.create({ patientId: dto.patientId, ...allergy });
          }
          processedRecords++;
        } catch (err) {
          failedRecords++;
          await this.jobRepo.addLog(job.id, 'error', `Failed to save allergy: ${(err as Error).message}`);
        }
      }

      for (const procedure of payload.procedures) {
        try {
          if (procedure.sourceId && dto.sourceSystem) {
            await this.procedureRepo.upsertBySource(dto.patientId, dto.sourceSystem, procedure.sourceId, procedure);
          } else {
            await this.procedureRepo.create({ patientId: dto.patientId, ...procedure });
          }
          processedRecords++;
        } catch (err) {
          failedRecords++;
          await this.jobRepo.addLog(job.id, 'error', `Failed to save procedure: ${(err as Error).message}`);
        }
      }

      const stats = { totalRecords: totalRecords, processedRecords, failedRecords, conflictsFound };
      await this.jobRepo.complete(job.id, stats);
      await this.jobRepo.addLog(job.id, 'info', `Import complete: ${processedRecords} processed, ${failedRecords} failed, ${conflictsFound} conflicts`);

      return { jobId: job.id, ...stats };
    } catch (err) {
      await this.jobRepo.fail(job.id, (err as Error).message);
      throw err;
    }
  }

  async export(dto: ExportDto) {
    const job = await this.jobRepo.create({
      direction: InteropDirection.EXPORT,
      adapter: dto.adapter,
      patientId: dto.patientId,
      organizationId: dto.organizationId,
    });

    await this.jobRepo.start(job.id);

    try {
      const records = await this.recordRepo.findByPatient(dto.patientId);
      const adapterInstance = this.registry.get(dto.adapter);
      const adapterCtx: AdapterContext = { patientId: dto.patientId, organizationId: dto.organizationId };
      const output = await adapterInstance.export(records, adapterCtx);

      await this.jobRepo.complete(job.id, {
        totalRecords: records.length,
        processedRecords: records.length,
        failedRecords: 0,
        conflictsFound: 0,
      });

      return { jobId: job.id, data: output };
    } catch (err) {
      await this.jobRepo.fail(job.id, (err as Error).message);
      throw err;
    }
  }
}
