import { ProjectRole } from '../enums/project-role.enum.js';

import { ProjectPermission } from
  '../enums/project-permission.enum.js';

const VIEWER_PERMISSIONS: ProjectPermission[] = [
  ProjectPermission.VIEW_PROJECT,
  ProjectPermission.VIEW_MEMBERS,
  ProjectPermission.VIEW_TASKS,
  ProjectPermission.VIEW_COMMENTS,
  ProjectPermission.VIEW_ACTIVITY,
];

const MEMBER_PERMISSIONS: ProjectPermission[] = [
  ...VIEWER_PERMISSIONS,

  ProjectPermission.CREATE_TASK,
  ProjectPermission.UPDATE_TASK,
  ProjectPermission.CREATE_COMMENT,
];

const MANAGER_PERMISSIONS: ProjectPermission[] = [
  ...MEMBER_PERMISSIONS,

  ProjectPermission.UPDATE_PROJECT,
  ProjectPermission.MANAGE_MEMBERS,
  ProjectPermission.DELETE_TASK,
  ProjectPermission.ASSIGN_TASK,
  ProjectPermission.MANAGE_SETTINGS,
];

export const PROJECT_ROLE_PERMISSIONS: Record<
  ProjectRole,
  readonly ProjectPermission[]
> = {
  [ProjectRole.VIEWER]: VIEWER_PERMISSIONS,
  [ProjectRole.MEMBER]: MEMBER_PERMISSIONS,
  [ProjectRole.MANAGER]: MANAGER_PERMISSIONS,
};

export const ORGANIZATION_ADMIN_PERMISSIONS =
  Object.values(ProjectPermission);