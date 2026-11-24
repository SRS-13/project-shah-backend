import { SetMetadata } from '@nestjs/common';

import type { ProjectPermission } from
  '../enums/project-permission.enum.js';

export const PROJECT_PERMISSIONS_KEY =
  'project_permissions';

export const ProjectPermissions = (
  ...permissions: ProjectPermission[]
) => SetMetadata(
  PROJECT_PERMISSIONS_KEY,
  permissions,
);