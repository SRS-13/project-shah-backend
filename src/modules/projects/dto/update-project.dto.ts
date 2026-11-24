import {
  PartialType,
  OmitType,
} from '@nestjs/swagger';

import { CreateProjectDto } from './create-project.dto.js';

export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['key'] as const),
) {}