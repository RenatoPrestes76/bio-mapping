import { Injectable } from '@nestjs/common';
import { ClinicalRecordType } from '@bio/database';
import { BaseInteropAdapter } from './base.adapter.js';
import { AdapterContext, InteropImportPayload } from '../models/canonical.types.js';

interface GenericRecord {
  recordType?: string;
  code?: string;
  codeSystem?: string;
  displayName?: string;
  effectiveDate?: string;
  sourceId?: string;
  value?: string;
  numericValue?: number;
  unit?: string;
  payload?: Record<string, unknown>;
}

interface GenericPayload {
  records?: GenericRecord[];
  medications?: Array<{ name: string; code?: string; dosage?: string; frequency?: string; route?: string; startDate?: string; sourceId?: string }>;
  allergies?: Array<{ allergen: string; code?: string; reaction?: string; severity?: string; onsetDate?: string; sourceId?: string }>;
  procedures?: Array<{ name: string; code?: string; performedDate?: string; outcome?: string; sourceId?: string }>;
}

@Injectable()
export class JsonGenericAdapter extends BaseInteropAdapter {
  readonly name = 'JSON_GENERIC';
  readonly description = 'Generic JSON adapter for Bio Mapping canonical format';

  async import(rawData: unknown, _context: AdapterContext): Promise<InteropImportPayload> {
    const data = rawData as GenericPayload;
    const payload = this.emptyPayload();

    for (const r of data.records ?? []) {
      payload.records.push({
        recordType: (r.recordType as ClinicalRecordType) ?? ClinicalRecordType.OTHER,
        code: r.code,
        codeSystem: r.codeSystem,
        displayName: r.displayName,
        effectiveDate: r.effectiveDate ? new Date(r.effectiveDate) : undefined,
        sourceId: r.sourceId,
        observations: r.value != null || r.numericValue != null
          ? [{ code: r.code, codeSystem: r.codeSystem, displayName: r.displayName, value: r.value, numericValue: r.numericValue, unit: r.unit }]
          : [],
        payload: r.payload ?? (r as unknown as Record<string, unknown>),
      });
    }

    for (const m of data.medications ?? []) {
      payload.medications.push({ ...m, startDate: m.startDate ? new Date(m.startDate) : undefined });
    }

    for (const a of data.allergies ?? []) {
      payload.allergies.push({ ...a, onsetDate: a.onsetDate ? new Date(a.onsetDate) : undefined });
    }

    for (const p of data.procedures ?? []) {
      payload.procedures.push({ ...p, performedDate: p.performedDate ? new Date(p.performedDate) : undefined });
    }

    return payload;
  }

  async export(records: unknown[], _context: AdapterContext): Promise<unknown> {
    return { records, exportedAt: new Date().toISOString(), format: 'JSON_GENERIC' };
  }
}
