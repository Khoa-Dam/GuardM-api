import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsArray, Min, Max, IsLatitude, IsLongitude } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
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
    @Type(() => Number)
    @IsLatitude({ message: 'Latitude must be a valid latitude value (-90 to 90)' })
    @IsOptional()
    lat?: number;

    @ApiPropertyOptional({ description: 'Longitude coordinate', example: 105.8542 })
    @IsNumber()
    @Type(() => Number)
    @IsLongitude({ message: 'Longitude must be a valid longitude value (-180 to 180)' })
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
    @IsString({ each: true, message: 'Each attachment must be a valid URL string' })
    @IsOptional()
    attachments?: string[];

    @ApiPropertyOptional({ description: 'Status of the report (0: active, 1: investigating, 2: resolved)', example: 0 })
    @IsNumber()
    @Min(0, { message: 'Status must be between 0 and 2' })
    @Max(2, { message: 'Status must be between 0 and 2' })
    @IsOptional()
    status?: number;

    @ApiPropertyOptional({ description: 'Severity level (1-5)', example: 3 })
    @IsNumber()
    @Type(() => Number)
    @Min(1, { message: 'Severity must be between 1 and 5' })
    @Max(5, { message: 'Severity must be between 1 and 5' })
    @IsOptional()
    severity?: number;

    @ApiPropertyOptional({ description: 'Date and time when the crime was reported', example: '2025-11-19T10:00:00Z' })
    @IsDateString()
    @IsOptional()
    reportedAt?: Date;
}
