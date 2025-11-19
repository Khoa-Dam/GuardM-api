import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrimeReport } from '../entities/crime-report.entity';
import { CreateCrimeReportDto } from './dtos/create-crime-report.dto';
import { CrimeType } from '../enums/crime-type.enum';
import { mapToCrimeReportResponse, CrimeReportResponse } from './dtos/crime-report-response.dto';

export interface CrimeHeatmapData {
    latitude: number;
    longitude: number;
    district: string;
    province: string;
    crimeType: CrimeType;
    count: number;
    severity: 'low' | 'medium' | 'high';
}

@Injectable()
export class CrimeReportsService {
    constructor(
        @InjectRepository(CrimeReport)
        private crimeReportRepository: Repository<CrimeReport>,
    ) { }

    async create(reporterId: string, createReportDto: CreateCrimeReportDto): Promise<CrimeReportResponse> {
        // Calculate severity based on crime type if not provided
        let severity = createReportDto.severity;
        if (!severity && createReportDto.type) {
            const dangerLevels: Record<string, number> = {
                'giet_nguoi': 5,    // Giết người - Rất nguy hiểm
                'bat_coc': 5,        // Bắt cóc - Rất nguy hiểm
                'truy_na': 4,        // Truy nã - Nguy hiểm
                'cuop_giat': 3,      // Cướp giật - Trung bình
                'de_doa': 2,         // Đe dọa
                'nghi_pham': 2,      // Nghi phạm
                'tron_chay': 1,      // Trốn chạy
                'dang_ngo': 1,       // Đáng ngờ
                'trom_cap': 1,       // Trộm cắp - Ít nguy hiểm
            };
            severity = dangerLevels[createReportDto.type] || 1;
        }

        const report = this.crimeReportRepository.create({
            ...createReportDto,
            reporterId,
            severity: severity || 1,
        });

        const savedReport = await this.crimeReportRepository.save(report);

        // Populate geom column from lat/lng if PostGIS is available
        if (savedReport.lat && savedReport.lng) {
            await this.crimeReportRepository.query(
                `UPDATE crime_reports 
                 SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326) 
                 WHERE id = $3`,
                [savedReport.lng, savedReport.lat, savedReport.id]
            );
        }

        return mapToCrimeReportResponse(savedReport);
    }

    async findAll(): Promise<CrimeReportResponse[]> {
        const reports = await this.crimeReportRepository.find({
            order: { createdAt: 'DESC' },
        });
        return reports.map(mapToCrimeReportResponse);
    }

    async findOne(id: string): Promise<CrimeReportResponse> {
        const report = await this.crimeReportRepository.findOne({
            where: { id },
            relations: ['reporter'],
        });

        if (!report) {
            throw new NotFoundException('Crime report not found');
        }

        return mapToCrimeReportResponse(report);
    }

    async findByDistrict(district: string): Promise<CrimeReportResponse[]> {
        const reports = await this.crimeReportRepository.find({
            where: { district },
            order: { createdAt: 'DESC' },
        });
        return reports.map(mapToCrimeReportResponse);
    }

    async findByCity(province: string): Promise<CrimeReportResponse[]> {
        const reports = await this.crimeReportRepository.find({
            where: { province },
            order: { createdAt: 'DESC' },
        });
        return reports.map(mapToCrimeReportResponse);
    }

    async getHeatmapData(): Promise<CrimeHeatmapData[]> {
        // Group by district and crime type
        const results = await this.crimeReportRepository
            .createQueryBuilder('report')
            .select('report.district', 'district')
            .addSelect('report.province', 'province')
            .addSelect('report.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .addSelect('AVG(report.lat)', 'avgLatitude')
            .addSelect('AVG(report.lng)', 'avgLongitude')
            .groupBy('report.district')
            .addGroupBy('report.province')
            .addGroupBy('report.type')
            .getRawMany();

        return results.map((result) => {
            const count = parseInt(result.count);
            const crimeType = result.type;

            // Tính severity dựa trên số lượng + mức độ nguy hiểm của loại tội phạm
            let severity: 'low' | 'medium' | 'high' = 'low';

            // Định nghĩa mức độ nguy hiểm của từng loại tội phạm (theo schema Laravel)
            const dangerLevels: Record<string, number> = {
                'giet_nguoi': 10,    // Giết người - Rất nguy hiểm
                'bat_coc': 9,        // Bắt cóc - Rất nguy hiểm
                'cuop_giat': 7,      // Cướp giật - Nguy hiểm
                'de_doa': 6,         // Đe dọa
                'truy_na': 8,        // Truy nã - Nguy hiểm
                'nghi_pham': 5,      // Nghi phạm
                'tron_chay': 4,      // Trốn chạy
                'dang_ngo': 3,       // Đáng ngờ
                'trom_cap': 3,       // Trộm cắp - Ít nguy hiểm hơn
            };

            const dangerLevel = dangerLevels[crimeType] || 1;
            const totalDangerScore = count * dangerLevel;

            // Điều chỉnh threshold theo mức độ nguy hiểm
            if (totalDangerScore > 150) severity = 'high';
            else if (totalDangerScore > 50) severity = 'medium';

            return {
                latitude: parseFloat(result.avgLatitude || 0),
                longitude: parseFloat(result.avgLongitude || 0),
                district: result.district,
                province: result.province,
                crimeType: result.type,
                count,
                severity,
            };
        });
    }

    async getStatistics() {
        const total = await this.crimeReportRepository.count();
        const byType = await this.crimeReportRepository
            .createQueryBuilder('report')
            .select('report.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .groupBy('report.type')
            .getRawMany();

        const byDistrict = await this.crimeReportRepository
            .createQueryBuilder('report')
            .select('report.district', 'district')
            .addSelect('COUNT(*)', 'count')
            .groupBy('report.district')
            .orderBy('count', 'DESC')
            .limit(10)
            .getRawMany();

        return {
            total,
            byType: byType.map((item) => ({
                type: item.type,
                count: parseInt(item.count),
            })),
            byDistrict: byDistrict.map((item) => ({
                district: item.district,
                count: parseInt(item.count),
            })),
        };
    }

    async findByLocation(lat: number, lng: number, radiusKm: number = 5): Promise<CrimeReport[]> {
        // Convert radius from km to degrees (approximate)
        // 1 degree ≈ 111 km at equator
        const radiusInDegrees = radiusKm / 111;

        // Query using PostGIS ST_DWithin
        const results = await this.crimeReportRepository
            .createQueryBuilder('report')
            .where(`ST_DWithin(
                geom::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :radius
            )`, { lat, lng, radius: radiusKm * 1000 }) // radius in meters
            .orderBy('report.createdAt', 'DESC')
            .limit(50) // Limit to 50 closest reports
            .getMany();

        return results;
    }

    async getNearbyAlert(lat: number, lng: number, radiusKm: number = 5): Promise<any> {
        const nearbyReports = await this.findByLocation(lat, lng, radiusKm);

        if (nearbyReports.length === 0) {
            return {
                hasAlert: false,
                message: 'Khu vực này an toàn',
            };
        }

        // Calculate total danger score
        const dangerLevels: Record<string, number> = {
            'giet_nguoi': 10,
            'bat_coc': 9,
            'cuop_giat': 7,
            'de_doa': 6,
            'truy_na': 8,
            'nghi_pham': 5,
            'tron_chay': 4,
            'dang_ngo': 3,
            'trom_cap': 3,
        };

        const totalDangerScore = nearbyReports.reduce((sum, report) => {
            const dangerLevel = dangerLevels[report.type] || 1;
            return sum + dangerLevel;
        }, 0);

        let alertLevel: 'low' | 'medium' | 'high' = 'low';
        if (totalDangerScore > 150) alertLevel = 'high';
        else if (totalDangerScore > 50) alertLevel = 'medium';

        return {
            hasAlert: true,
            alertLevel,
            totalReports: nearbyReports.length,
            totalDangerScore,
            reports: nearbyReports.map(report => ({
                id: report.id,
                title: report.title,
                type: report.type,
                lat: report.lat,
                lng: report.lng,
                address: report.address,
                createdAt: report.createdAt,
            })),
        };
    }
}
