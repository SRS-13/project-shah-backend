import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

interface AccessTokenPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const [type, token] =
      request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Access token is required',
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>(
            'JWT_ACCESS_SECRET',
          ),
          issuer: 'teamflow-api',
          audience: 'teamflow-client',
        },
      );

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired access token',
      );
    }
  }
}
