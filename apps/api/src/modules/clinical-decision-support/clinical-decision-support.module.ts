import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { ClinicalKnowledgeModule } from '../clinical-knowledge/clinical-knowledge.module.js';
import { ClinicalReasoningModule } from '../clinical-reasoning/clinical-reasoning.module.js';
import { PersonalizedMedicineModule } from '../personalized-medicine/personalized-medicine.module.js';
import { GenomicInterpretationModule } from '../genomic-interpretation/genomic-interpretation.module.js';
import { PharmacogenomicsModule } from '../pharmacogenomics/pharmacogenomics.module.js';
import { EvidenceEngineModule } from '../evidence-engine/evidence-engine.module.js';

// Existing (Prisma-backed rule engine)
import { PrismaClinicalDecisionRepository } from './repositories/prisma-clinical-decision.repository.js';
import { ClinicalDecisionSupportService } from './services/clinical-decision-support.service.js';
import { ClinicalDecisionSupportController } from './controllers/clinical-decision-support.controller.js';

// GAIA CDS layer (Sprint 14.15)
import { ClinicalDecisionOrchestrator } from './services/clinical-decision-orchestrator.js';
import { ClinicalDecisionSupportProvider } from './providers/clinical-decision-support.provider.js';
import { GaiaClinicalDecisionService } from './clinical-decision-support.service.js';
import { GaiaClinicalDecisionController } from './clinical-decision-support.controller.js';

@Module({
  imports: [
    DatabaseModule,
    ClinicalKnowledgeModule,
    ClinicalReasoningModule,
    PersonalizedMedicineModule,
    GenomicInterpretationModule,
    PharmacogenomicsModule,
    EvidenceEngineModule,
  ],
  controllers: [ClinicalDecisionSupportController, GaiaClinicalDecisionController],
  providers: [
    PrismaClinicalDecisionRepository,
    ClinicalDecisionSupportService,
    ClinicalDecisionOrchestrator,
    ClinicalDecisionSupportProvider,
    GaiaClinicalDecisionService,
  ],
  exports: [ClinicalDecisionSupportService, GaiaClinicalDecisionService],
})
export class ClinicalDecisionSupportModule {}
