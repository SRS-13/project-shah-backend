import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';

import { isUUID } from 'class-validator';

import type { Request } from 'express';

import { ProjectAccessService } from
  '../services/project-access.service.js';

import type { ProjectAccess } from
  '../interfaces/project-access.interface.js';

import type { JwtPayload } from
  '../../auth/interfaces/jwt-payload.interface.js';

export type ProjectRequest = Request & {
  user?: JwtPayload;
  projectAccess?: ProjectAccess;
};

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<ProjectRequest>();

    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException();
    }

    const {
      organizationId,
      projectId,
    } = request.params;

    if (
      typeof organizationId !== 'string' ||
      typeof projectId !== 'string' ||
      !isUUID(organizationId) ||
      !isUUID(projectId)
    ) {
      throw new BadRequestException(
        'Invalid organization or project ID',
      );
    }

    request.projectAccess =
      await this.projectAccessService.getAccess(
        organizationId,
        projectId,
        userId,
      );

    return true;
  }
}