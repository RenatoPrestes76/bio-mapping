import { Injectable } from '@nestjs/common';
import { InteropAdapter } from '@bio/database';
import { BaseInteropAdapter } from './base.adapter.js';
import { FhirR4Adapter } from './fhir-r4.adapter.js';
import { Hl7V2Adapter } from './hl7-v2.adapter.js';
import { JsonGenericAdapter } from './json-generic.adapter.js';

@Injectable()
export class AdapterRegistry {
  private readonly adapters: Map<InteropAdapter, BaseInteropAdapter>;

  constructor(
    private readonly fhirR4: FhirR4Adapter,
    private readonly hl7V2: Hl7V2Adapter,
    private readonly jsonGeneric: JsonGenericAdapter,
  ) {
    this.adapters = new Map<InteropAdapter, BaseInteropAdapter>([
      [InteropAdapter.FHIR_R4, fhirR4],
      [InteropAdapter.HL7_V2, hl7V2],
      [InteropAdapter.JSON_GENERIC, jsonGeneric],
      [InteropAdapter.CSV, jsonGeneric],
      [InteropAdapter.CUSTOM, jsonGeneric],
    ]);
  }

  get(adapter: InteropAdapter): BaseInteropAdapter {
    const instance = this.adapters.get(adapter);
    if (!instance) throw new Error(`Adapter ${adapter} not registered`);
    return instance;
  }

  list(): Array<{ name: string; adapter: string; description: string }> {
    return [...this.adapters.entries()].map(([key, inst]) => ({
      adapter: key,
      name: inst.name,
      description: inst.description,
    }));
  }
}
