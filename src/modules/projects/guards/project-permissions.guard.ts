import {
  Injectable,
  ForbiddenException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { PROJECT_PERMISSIONS_KEY } from
  '../decorators/project-permissions.decorator.js';

import type { ProjectPermission } from
  '../enums/project-permission.enum.js';

import type { ProjectRequest } from
  './project-access.guard.js';

import { ProjectAccessService } from
  '../services/project-access.service.js';

@Injectable()
export class ProjectPermissionsGuard
  implements CanActivate
{
  constructor(
    private readonly reflector: Reflector,

    private readonly projectAccessService: ProjectAccessService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<
        ProjectPermission[]
      >(
        PROJECT_PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<ProjectRequest>();

    const access = request.projectAccess;

    if (!access) {
      throw new ForbiddenException(
        'Project access has not been validated',
      );
    }

    if (
      !this.projectAccessService.hasPermissions(
        access,
        requiredPermissions,
      )
    ) {
      throw new ForbiddenException(
        'Insufficient project permissions',
      );
    }

    return true;
  }
}