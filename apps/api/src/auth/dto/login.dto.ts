import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'dayo@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'correct-horse-battery-staple' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
