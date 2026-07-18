import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { VitalsModule } from '../vitals/vitals.module';
import { HippocratesModule } from '../hippocrates/hippocrates.module.js';
import { ApolloModule } from '../apollo/apollo.module.js';
import { OracleModule } from '../oracle/oracle.module.js';
import { AssessmentsModule } from '../clinical/assessments/assessments.module';
import { ClinicalContextBuilder } from './clinical-context.builder';
import { DecisionEngineService } from './decision-engine.service';
import { ExplainabilityModule } from './explainability/explainability.module';
import { RecommendationEngineModule } from './recommendations/recommendation-engine.module';

@Module({
  imports: [
    PatientsModule,
    VitalsModule,
    HippocratesModule,
    ApolloModule,
    OracleModule,
    AssessmentsModule,
    ExplainabilityModule,
    RecommendationEngineModule,
  ],
  providers: [ClinicalContextBuilder, DecisionEngineService],
  // Nest só permite re-exportar um provider vindo de um módulo importado se o
  // MÓDULO em si estiver em `exports` — exportar a classe do provider direto
  // (ExplainabilityEngine/RecommendationEngine) falha em runtime com
  // UnknownExportException, mesmo compilando sem erro no TypeScript.
  exports: [ClinicalContextBuilder, DecisionEngineService, ExplainabilityModule, RecommendationEngineModule],
})
export class GaiaModule {}
