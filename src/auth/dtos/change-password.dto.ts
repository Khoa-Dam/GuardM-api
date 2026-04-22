import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password', example: 'oldpassword123' })
  @IsString()
  oldPassword!: string;

  @ApiProperty({
    description: 'New password (min 8 characters, at least 1 letter and 1 number)',
    example: 'newpassword123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
    message: 'Password must contain at least one letter, one number, and be at least 8 characters long',
  })
  newPassword!: string;
}
