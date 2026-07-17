import { AdapterContext, InteropImportPayload } from '../models/canonical.types.js';
import { ClinicalRecord } from '@bio/database';

export abstract class BaseInteropAdapter {
  abstract readonly name: string;
  abstract readonly description: string;

  abstract import(rawData: unknown, context: AdapterContext): Promise<InteropImportPayload>;

  abstract export(records: ClinicalRecord[], context: AdapterContext): Promise<unknown>;

  protected emptyPayload(): InteropImportPayload {
    return { records: [], medications: [], allergies: [], procedures: [] };
  }
}
