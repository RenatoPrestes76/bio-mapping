import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
