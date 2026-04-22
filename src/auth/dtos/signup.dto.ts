import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ description: 'User full name', example: 'John Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'User email address', example: 'john.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'User password (min 8 characters, at least 1 letter and 1 number)',
    example: 'password123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, {
    message: 'Password must contain at least one letter, one number, and be at least 8 characters long',
  })
  password!: string;
}
