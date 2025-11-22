import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token', example: 'reset-token-abc123' })
  @IsString()
  resetToken: string;

  @ApiProperty({
    description: 'New password (min 6 characters, must contain at least one number)',
    example: 'newpassword123',
    minLength: 6
  })
  @IsString()
  @MinLength(6)
  @Matches(/^(?=.*[0-9])/, { message: 'Password must contain at least one number' })
  newPassword: string;
}
