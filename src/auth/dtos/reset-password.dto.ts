import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token', example: 'reset-token-abc123' })
  @IsString()
  resetToken: string;

  @ApiProperty({
    description: 'New password',
    example: 'newpassword123',
  })
  @IsString()
  newPassword: string;
}
