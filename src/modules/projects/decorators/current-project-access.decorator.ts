import {
  createParamDecorator,
  ForbiddenException,
  type ExecutionContext,
} from '@nestjs/common';

import type { ProjectRequest } from
  '../guards/project-access.guard.js';

export const CurrentProjectAccess =
  createParamDecorator(
    (_data: unknown, context: ExecutionContext) => {
      const request = context
        .switchToHttp()
        .getRequest<ProjectRequest>();

      if (!request.projectAccess) {
        throw new ForbiddenException(
          'Project access has not been validated',
        );
      }

      return request.projectAccess;
    },
  );