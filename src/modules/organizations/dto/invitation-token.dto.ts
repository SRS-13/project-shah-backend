import { ApiProperty } from '@nestjs/swagger';
import { IsHexadecimal, IsString, Length } from 'class-validator';

export class InvitationTokenDto {
  @ApiProperty({ description: '64-character invitation token' })
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  token: string;
}