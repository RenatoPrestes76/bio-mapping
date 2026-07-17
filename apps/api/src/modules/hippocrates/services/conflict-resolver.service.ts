import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ClinicalRecordRepository } from '../repositories/clinical-record.repository.js';
import { CanonicalClinicalRecord } from '../models/canonical.types.js';

export type ConflictResolution = 'CREATED' | 'UPDATED' | 'SKIPPED' | 'CONFLICT';

export interface ResolveResult {
  resolution: ConflictResolution;
  recordId: string;
  conflictDetails?: { previousChecksum: string; newChecksum: string };
}

@Injectable()
export class ConflictResolverService {
  constructor(private readonly recordRepo: ClinicalRecordRepository) {}

  computeChecksum(payload: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  async resolveAndSave(
    patientId: string,
    record: CanonicalClinicalRecord,
    context: { sourceSystem?: string; organizationId?: string; importedVia?: string },
  ): Promise<ResolveResult> {
    const checksum = this.computeChecksum(record.payload);

    if (record.sourceId && context.sourceSystem) {
      const existing = await this.recordRepo.findByExternalId(context.sourceSystem, record.sourceId);

      if (existing) {
        if (existing.checksum === checksum) {
          return { resolution: 'SKIPPED', recordId: existing.id };
        }

        const previousChecksum = existing.checksum ?? '';
        await this.recordRepo.update(existing.id, {
          payload: record.payload,
          checksum,
          version: existing.version + 1,
        });

        if (record.observations?.length) {
          for (const obs of record.observations) {
            await this.recordRepo.addObservation({ clinicalRecordId: existing.id, patientId, ...obs });
          }
        }

        return {
          resolution: 'CONFLICT',
          recordId: existing.id,
          conflictDetails: { previousChecksum, newChecksum: checksum },
        };
      }
    }

    const newRecord = await this.recordRepo.create({
      patientId,
      organizationId: context.organizationId,
      recordType: record.recordType,
      code: record.code,
      codeSystem: record.codeSystem,
      displayName: record.displayName,
      effectiveDate: record.effectiveDate,
      sourceSystem: context.sourceSystem,
      sourceId: record.sourceId,
      payload: record.payload,
      checksum,
      importedVia: context.importedVia,
    });

    if (record.observations?.length) {
      for (const obs of record.observations) {
        await this.recordRepo.addObservation({ clinicalRecordId: newRecord.id, patientId, ...obs });
      }
    }

    if (record.sourceId && context.sourceSystem) {
      await this.recordRepo.addExternalId(newRecord.id, context.sourceSystem, record.sourceId);
    }

    return { resolution: 'CREATED', recordId: newRecord.id };
  }
}
