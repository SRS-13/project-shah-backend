import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    description: 'Refresh token issued during login',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}