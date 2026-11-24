import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { ProjectRole } from '../enums/project-role.enum.js';

export class UpdateProjectMemberDto {
  @ApiProperty({
    enum: ProjectRole,
    example: ProjectRole.MEMBER,
  })
  @IsEnum(ProjectRole)
  role: ProjectRole;
}