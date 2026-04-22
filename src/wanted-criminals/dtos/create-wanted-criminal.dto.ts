import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWantedCriminalDto {
    @ApiProperty({ description: 'Full name of the wanted person', example: 'Nguyen Van A' })
    @IsString()
    @IsNotEmpty()
    name!: string; // Họ tên đối tượng

    @ApiProperty({ description: 'Year of birth', example: 1990 })
    @IsNumber()
    @IsNotEmpty()
    birthYear!: number; // Năm sinh

    @ApiPropertyOptional({ description: 'Registered permanent address (Nơi ĐKTT)', example: 'Hanoi, Vietnam' })
    @IsString()
    @IsOptional()
    address?: string; // Nơi ĐKTT (Đăng ký thường trú)

    @ApiPropertyOptional({ description: 'Parents name (Họ tên bố/mẹ)', example: 'Nguyen Van B - Nguyen Thi C' })
    @IsString()
    @IsOptional()
    parents?: string; // Họ tên bố/mẹ

    @ApiProperty({ description: 'Crime description (Tội danh)', example: 'Trom cap tai san' })
    @IsString()
    @IsNotEmpty()
    crime!: string; // Tội danh

    @ApiPropertyOptional({ description: 'Decision number (Số ngày QĐ)', example: '123/2025/QĐ-BCA' })
    @IsString()
    @IsOptional()
    decisionNumber?: string; // Số ngày QĐ

    @ApiPropertyOptional({ description: 'Issuing unit (Đơn vị ra QĐTN)', example: 'Bo Cong An' })
    @IsString()
    @IsOptional()
    issuingUnit?: string; // Đơn vị ra QĐTN (Quyết định truy nã)
}

