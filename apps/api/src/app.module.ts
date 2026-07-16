import { Module } from '@nestjs/common';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
