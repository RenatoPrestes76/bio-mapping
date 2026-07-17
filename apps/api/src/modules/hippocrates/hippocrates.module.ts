import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';

import { FhirR4Adapter } from './adapters/fhir-r4.adapter.js';
import { Hl7V2Adapter } from './adapters/hl7-v2.adapter.js';
import { JsonGenericAdapter } from './adapters/json-generic.adapter.js';
import { AdapterRegistry } from './adapters/adapter.registry.js';

import { ClinicalRecordRepository } from './repositories/clinical-record.repository.js';
import { ConsentRepository } from './repositories/consent.repository.js';
import { InteropJobRepository } from './repositories/interop-job.repository.js';
import { MedicationRepository } from './repositories/medication.repository.js';
import { AllergyRepository } from './repositories/allergy.repository.js';
import { ProcedureRepository } from './repositories/procedure.repository.js';

import { ClinicalRecordService } from './services/clinical-record.service.js';
import { ConsentService } from './services/consent.service.js';
import { ConflictResolverService } from './services/conflict-resolver.service.js';
import { InteropSyncService } from './services/interop-sync.service.js';

import { InteropController } from './controllers/interop.controller.js';
import { ConsentController } from './controllers/consent.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [InteropController, ConsentController],
  providers: [
    FhirR4Adapter,
    Hl7V2Adapter,
    JsonGenericAdapter,
    AdapterRegistry,
    ClinicalRecordRepository,
    ConsentRepository,
    InteropJobRepository,
    MedicationRepository,
    AllergyRepository,
    ProcedureRepository,
    ClinicalRecordService,
    ConsentService,
    ConflictResolverService,
    InteropSyncService,
  ],
  exports: [ClinicalRecordService, ConsentService, InteropSyncService],
})
export class HippocratesModule {}
