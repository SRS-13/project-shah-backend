import type { Project } from '../entities/project.entity.js';

import type { ProjectMember } from
  '../entities/project-member.entity.js';

import type { OrganizationMember } from
  '../../organizations/entities/organization-member.entity.js';

import type { ProjectPermission } from
  '../enums/project-permission.enum.js';

export interface ProjectAccess {
  project: Project;

  organizationMember: OrganizationMember;

  projectMember: ProjectMember | null;

  isAdmin: boolean;

  canManage: boolean;

  permissions: readonly ProjectPermission[];
}