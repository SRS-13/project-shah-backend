import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';

import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { LoginDto } from './dto/login.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';

import { RefreshSession } from './entities/refresh-session.entity.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,

    @InjectRepository(RefreshSession)
    private readonly sessionRepository: Repository<RefreshSession>,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.usersService.create(dto.name.trim(), email, passwordHash);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email.trim().toLowerCase());

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  private async generateTokens(user: { id: string; email: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: 900,
      issuer: 'teamflow-api',
      audience: 'teamflow-client',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: 604800,
      issuer: 'teamflow-api',
      audience: 'teamflow-refresh',
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
      }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        issuer: 'teamflow-api',
        audience: 'teamflow-refresh',
      });

      return this.generateTokens({
        id: payload.sub,
        email: payload.email,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  async logout(refreshToken: string) {
    // Verify refresh token signature and expiration
    const payload = await this.jwtService
      .verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        issuer: 'teamflow-api',
        audience: 'teamflow-refresh',
      })
      .catch(() => null);

    // Idempotent logout: don't disclose token validity
    if (!payload?.sub) {
      return { message: 'Logged out successfully' };
    }

    const tokenHash = this.hashRefreshToken(refreshToken);

    // Revoke only the matching active session
    await this.sessionRepository
      .createQueryBuilder()
      .update(RefreshSession)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId: payload.sub })
      .andWhere('token_hash = :tokenHash', { tokenHash })
      .andWhere('revoked_at IS NULL')
      .execute();

    return {
      message: 'Logged out successfully',
    };
  }
}
