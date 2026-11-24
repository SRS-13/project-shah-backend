import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

import { Project } from './entities/project.entity.js';
import { ProjectMember } from './entities/project-member.entity.js';

import { Organization } from '../organizations/entities/organization.entity.js';
import { OrganizationMember } from '../organizations/entities/organization-member.entity.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ProjectMembersService } from './project-members.service.js';
import { ProjectMembersController } from './project-members.controller.js';
import { ProjectAccessService } from './services/project-access.service.js';

import { ProjectAccessGuard } from './guards/project-access.guard.js';

import { ProjectPermissionsGuard } from './guards/project-permissions.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, Organization, OrganizationMember]),
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [ProjectsController, ProjectMembersController],
  providers: [
    ProjectsService,
    ProjectMembersService,
    ProjectAccessService,

    JwtAuthGuard,
    ProjectAccessGuard,
    ProjectPermissionsGuard,
  ],
  exports: [
    ProjectsService,
    ProjectMembersService,
    ProjectAccessService,
    ProjectAccessGuard,
    ProjectPermissionsGuard,
    JwtAuthGuard,
  ],
})
export class ProjectsModule {}
