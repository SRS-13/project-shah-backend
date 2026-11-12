import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { UsersModule } from '../users/users.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshSession } from './entities/refresh-session.entity.js';

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([RefreshSession]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
