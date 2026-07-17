import { Injectable, NotImplementedException } from '@nestjs/common';
import { BaseInteropAdapter } from './base.adapter.js';
import { AdapterContext, InteropImportPayload } from '../models/canonical.types.js';

@Injectable()
export class Hl7V2Adapter extends BaseInteropAdapter {
  readonly name = 'HL7_V2';
  readonly description = 'HL7 v2.x message adapter (structure prepared, parser not yet implemented)';

  async import(_rawData: unknown, _context: AdapterContext): Promise<InteropImportPayload> {
    throw new NotImplementedException(
      'HL7 v2 import not yet implemented. Use FHIR_R4 or JSON_GENERIC adapter.',
    );
  }

  async export(_records: unknown[], _context: AdapterContext): Promise<unknown> {
    throw new NotImplementedException(
      'HL7 v2 export not yet implemented. Use FHIR_R4 or JSON_GENERIC adapter.',
    );
  }
}
