import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CrimeType } from '../../enums/crime-type.enum';

export class CreateCrimeReportDto {
    @ApiPropertyOptional({ description: 'Title of the crime report', example: 'Theft at downtown mall' })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({ description: 'Detailed description of the crime', example: 'A theft occurred at the mall entrance' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({
        description: 'Type of crime',
        enum: CrimeType,
        example: CrimeType.TROM_CAP
    })
    @IsEnum(CrimeType)
    @IsOptional()
    type?: CrimeType;

    @ApiPropertyOptional({ description: 'Latitude coordinate', example: 21.0285 })
    @IsNumber()
    @IsOptional()
    lat?: number;

    @ApiPropertyOptional({ description: 'Longitude coordinate', example: 105.8542 })
    @IsNumber()
    @IsOptional()
    lng?: number;

    @ApiPropertyOptional({ description: 'Full address', example: '123 Main Street, Hanoi' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({ description: 'Area code', example: '100000' })
    @IsString()
    @IsOptional()
    areaCode?: string;

    @ApiPropertyOptional({ description: 'Province/City name', example: 'Hanoi' })
    @IsString()
    @IsOptional()
    province?: string;

    @ApiPropertyOptional({ description: 'District name', example: 'Hoan Kiem' })
    @IsString()
    @IsOptional()
    district?: string;

    @ApiPropertyOptional({ description: 'Ward name', example: 'Cua Dong' })
    @IsString()
    @IsOptional()
    ward?: string;

    @ApiPropertyOptional({ description: 'Street name', example: 'Main Street' })
    @IsString()
    @IsOptional()
    street?: string;

    @ApiPropertyOptional({ description: 'Source of the report', example: 'User report' })
    @IsString()
    @IsOptional()
    source?: string;

    @ApiPropertyOptional({ description: 'Array of attachment URLs', type: [String], example: ['https://example.com/image.jpg'] })
    @IsArray()
    @IsOptional()
    attachments?: string[];

    @ApiPropertyOptional({ description: 'Status of the report (0: active, 1: investigating, 2: resolved)', example: 0 })
    @IsNumber()
    @IsOptional()
    status?: number;

    @ApiPropertyOptional({ description: 'Severity level (1-5)', example: 3 })
    @IsNumber()
    @IsOptional()
    severity?: number;

    @ApiPropertyOptional({ description: 'Date and time when the crime was reported', example: '2025-11-19T10:00:00Z' })
    @IsDateString()
    @IsOptional()
    reportedAt?: Date;
}
