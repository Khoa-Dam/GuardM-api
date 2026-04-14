import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMeDto {
    @ApiPropertyOptional({ description: 'User full name', example: 'Nguyen Van A' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ description: 'Avatar URL (Cloudinary)', example: 'https://res.cloudinary.com/...' })
    @IsString()
    @IsOptional()
    avatar?: string;
}