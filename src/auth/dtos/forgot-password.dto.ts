import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email address to reset password', example: 'john.doe@example.com' })
  @IsEmail()
  email: string;
}
