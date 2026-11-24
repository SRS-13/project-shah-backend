import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { Request } from 'express';

import { OrganizationsService } from './organizations.service.js';
import { InvitationTokenDto } from './dto/invitation-token.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}


type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview invitation details',
  })
  preview(@Body() dto: InvitationTokenDto) {
    return this.organizationsService.previewInvitation(dto);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accept organization invitation',
  })
  accept(
    @Body() dto: InvitationTokenDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.organizationsService.acceptInvitation(
      dto,
      req.user.sub,
    );
  }

  @Post('decline')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Decline organization invitation',
  })
  decline(
    @Body() dto: InvitationTokenDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.organizationsService.declineInvitation(
      dto,
      req.user.sub,
    );
  }
}