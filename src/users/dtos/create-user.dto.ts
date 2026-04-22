import { IsEmail, IsString, Matches, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../auth/enums/role.enum';

export class CreateUserDto {
    @ApiProperty({ description: 'User full name', example: 'John Doe' })
    @IsString()
    name!: string;

    @ApiProperty({ description: 'User email address', example: 'john.doe@example.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({
        description: 'User password (min 6 characters, must contain at least one number)',
        example: 'password123',
        minLength: 6
    })
    @IsString()
    @MinLength(6)
    @Matches(/^(?=.*[0-9])/, { message: 'Password must contain at least one number' })
    password: string;

    @ApiPropertyOptional({
        description: 'User role',
        example: 'User',
        enum: Role,
        default: Role.User
    })
    @IsEnum(Role)
    @IsOptional()
    role?: Role;
}

