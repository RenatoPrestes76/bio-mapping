import { Module } from '@nestjs/common';
import { PatientsModule } from '../patients/patients.module';
import { VitalsModule } from '../vitals/vitals.module';
import { HippocratesModule } from '../hippocrates/hippocrates.module.js';
import { ApolloModule } from '../apollo/apollo.module.js';
import { OracleModule } from '../oracle/oracle.module.js';
import { AssessmentsModule } from '../clinical/assessments/assessments.module';
import { ClinicalContextBuilder } from './clinical-context.builder';
import { DecisionEngineService } from './decision-engine.service';

@Module({
  imports: [
    PatientsModule,
    VitalsModule,
    HippocratesModule,
    ApolloModule,
    OracleModule,
    AssessmentsModule,
  ],
  providers: [ClinicalContextBuilder, DecisionEngineService],
  exports: [ClinicalContextBuilder, DecisionEngineService],
})
export class GaiaModule {}
