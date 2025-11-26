import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WeatherNewsType } from '../entities/weather-news.entity';

export class CreateWeatherNewsDto {
    @ApiProperty({ enum: WeatherNewsType, description: 'Type of weather news' })
    @IsEnum(WeatherNewsType)
    @IsNotEmpty()
    type: WeatherNewsType;

    @ApiProperty({ description: 'Title of the news' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({ description: 'Summary of the news' })
    @IsString()
    @IsOptional()
    summary?: string;

    @ApiPropertyOptional({ description: 'Full content of the news' })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiPropertyOptional({ description: 'Main image URL' })
    @IsUrl()
    @IsOptional()
    imageUrl?: string;

    @ApiPropertyOptional({ description: 'Source URL' })
    @IsUrl()
    @IsOptional()
    sourceUrl?: string;

    @ApiPropertyOptional({ description: 'Published date' })
    @IsDateString()
    @IsOptional()
    publishedDate?: Date;

    @ApiPropertyOptional({ description: 'Next update time' })
    @IsDateString()
    @IsOptional()
    nextUpdateAt?: Date;

    @ApiPropertyOptional({ description: 'Location' })
    @IsString()
    @IsOptional()
    location?: string;

    @ApiPropertyOptional({ description: 'Severity level' })
    @IsString()
    @IsOptional()
    severity?: string;
}
