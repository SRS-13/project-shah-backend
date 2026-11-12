import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Jhon Doe', description: "User's name", required: true })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongPassword123!',
    minLength: 8,
  })
  
  @IsString()
  @MinLength(8)
  password: string;
}
