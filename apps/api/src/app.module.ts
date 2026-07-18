import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './common/config/config.module';
import { LoggerModule } from './common/logger/logger.module';
import { AuditLogModule } from './common/audit/audit-log.module';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './common/storage/storage.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/identity/auth/auth.module';
import { UsersModule } from './modules/identity/users/users.module';
import { BiologicalProfileModule } from './modules/biological-profile/biological-profile.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { PatientsModule } from './modules/patients/patients.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { MembershipModule } from './modules/membership/membership.module';
import { InvitesModule } from './modules/invites/invites.module';
import { VitalsModule } from './modules/vitals/vitals.module';
import { BiomarkersModule } from './modules/biomarkers/biomarkers.module';
import { ClinicalModule } from './modules/clinical/clinical.module';
import { DevicesModule } from './modules/devices/devices.module';
import { BioScoreModule } from './modules/bioscore/bioscore.module';
import { OracleModule } from './modules/oracle/oracle.module';
import { PulseModule } from './modules/pulse/pulse.module';
import { AegisModule } from './modules/aegis/aegis.module';
import { ClinicalRiskModule } from './modules/clinical/risk/clinical-risk.module';
import { PredictionEngineModule } from './modules/gaia/predictions/prediction-engine.module.js';
import { ApolloModule } from './modules/apollo/apollo.module.js';
import { TitanModule } from './modules/titan/titan.module.js';
import { HippocratesModule } from './modules/hippocrates/hippocrates.module.js';
import { ClinicalKnowledgeModule } from './modules/clinical-knowledge/clinical-knowledge.module.js';
import { ClinicalDecisionSupportModule } from './modules/clinical-decision-support/clinical-decision-support.module.js';
import { ClinicalPathwaysModule } from './modules/clinical-pathways/clinical-pathways.module.js';
import { PatientMonitoringModule } from './modules/patient-monitoring/patient-monitoring.module.js';
import { ClinicalTrendsModule } from './modules/clinical-trends/clinical-trends.module.js';
import { StoryEngineModule } from './modules/story-engine/story-engine.module.js';
import { BioCircleModule } from './modules/biocircle/biocircle.module.js';
import { BioTeamsModule } from './modules/bioteams/bioteams.module.js';
import { CdsModule } from './modules/gaia/cds/cds.module.js';
import { LearningModule } from './modules/gaia/learning/learning.module.js';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    AuditLogModule,
    DatabaseModule,
    StorageModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    HealthModule,
    AuthModule,
    UsersModule,
    BiologicalProfileModule,
    ProfilesModule,
    ProfessionalsModule,
    PatientsModule,
    OrganizationsModule,
    MembershipModule,
    InvitesModule,
    VitalsModule,
    BiomarkersModule,
    ClinicalModule,
    DevicesModule,
    BioScoreModule,
    OracleModule,
    PulseModule,
    AegisModule,
    ClinicalRiskModule,
    PredictionEngineModule,
    ApolloModule,
    TitanModule,
    HippocratesModule,
    ClinicalKnowledgeModule,
    ClinicalDecisionSupportModule,
    ClinicalPathwaysModule,
    PatientMonitoringModule,
    ClinicalTrendsModule,
    StoryEngineModule,
    BioCircleModule,
    BioTeamsModule,
    CdsModule,
    LearningModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
