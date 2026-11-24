import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { OrganizationsController } from './organizations.controller.js';
import { InvitationsController } from './invitations.controller.js';
import { OrganizationsService } from './organizations.service.js';

import { Organization } from './entities/organization.entity.js';
import { OrganizationMember } from './entities/organization-member.entity.js';
import { OrganizationInvitation } from './entities/organization-invitation.entity.js';
import { User } from '../users/entities/user.entity.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OrganizationRolesGuard } from './guards/organization-roles.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMember,
      OrganizationInvitation,
      User,
    ]),
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [
    OrganizationsController,
    InvitationsController,
  ],
  providers: [
    OrganizationsService,
    JwtAuthGuard,
    OrganizationRolesGuard,
  ],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}