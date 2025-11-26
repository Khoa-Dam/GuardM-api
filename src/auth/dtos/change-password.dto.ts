import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password', example: 'oldpassword123' })
  @IsString()
  oldPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'newpassword123',
  })
  @IsString()
  newPassword: string;
}
