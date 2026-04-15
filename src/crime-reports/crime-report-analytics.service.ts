import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrimeReport } from './entities/crime-report.entity';
import { CrimeType } from '../enums/crime-type.enum';
import { CRIME_DANGER_WEIGHT } from '../shared/crime-types.constants';

export interface CrimeHeatmapData {
    latitude: number;
    longitude: number;
    district: string;
    province: string;
    crimeType: CrimeType;
    count: number;
    severity: 'low' | 'medium' | 'high';
}

export interface CrimeStatistics {
    total: number;
    activeAlerts: number;
    highSeverity: number;
    byType: { type: string; count: number }[];
    byDistrict: { district: string; count: number }[];
}

export interface NearbyAlertResult {
    hasAlert: boolean;
    alertLevel?: 'low' | 'medium' | 'high';
    message?: string;
    totalReports?: number;
    totalDangerScore?: number;
    reports?: { id: string; title?: string; type: CrimeType; lat: number; lng: number; address?: string; createdAt: Date }[];
}

@Injectable()
export class CrimeReportAnalyticsService {
    constructor(
        @InjectRepository(CrimeReport)
        private readonly repo: Repository<CrimeReport>,
    ) {}

    async getHeatmapData(): Promise<CrimeHeatmapData[]> {
        const results = await this.repo
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

        return results.map(result => {
            const count = parseInt(result.count);
            const dangerLevel = CRIME_DANGER_WEIGHT[result.type as keyof typeof CRIME_DANGER_WEIGHT] ?? 1;
            const totalDangerScore = count * dangerLevel;

            let severity: 'low' | 'medium' | 'high' = 'low';
            if (totalDangerScore > 150) severity = 'high';
            else if (totalDangerScore > 50) severity = 'medium';

            return {
                latitude:  parseFloat(result.avgLatitude || 0),
                longitude: parseFloat(result.avgLongitude || 0),
                district:  result.district,
                province:  result.province,
                crimeType: result.type,
                count,
                severity,
            };
        });
    }

    async getStatistics(): Promise<CrimeStatistics> {
        const [total, activeAlerts, highSeverity, byTypeRaw, byDistrictRaw] = await Promise.all([
            this.repo.count(),
            this.repo.count({ where: { status: 0 } }),
            this.repo.count({ where: { severity: 4 } }),
            this.repo.createQueryBuilder('report')
                .select('report.type', 'type')
                .addSelect('COUNT(*)', 'count')
                .groupBy('report.type')
                .getRawMany(),
            this.repo.createQueryBuilder('report')
                .select('report.district', 'district')
                .addSelect('COUNT(*)', 'count')
                .groupBy('report.district')
                .orderBy('count', 'DESC')
                .limit(10)
                .getRawMany(),
        ]);

        return {
            total,
            activeAlerts,
            highSeverity,
            byType:     byTypeRaw.map(i => ({ type: i.type, count: parseInt(i.count) })),
            byDistrict: byDistrictRaw.map(i => ({ district: i.district, count: parseInt(i.count) })),
        };
    }

    async getNearbyAlert(lat: number, lng: number, radiusKm = 5): Promise<NearbyAlertResult> {
        const nearbyReports = await this.repo
            .createQueryBuilder('report')
            .where(`ST_DWithin(
                geom::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :radius
            )`, { lat, lng, radius: radiusKm * 1000 })
            .orderBy('report.createdAt', 'DESC')
            .limit(50)
            .getMany();

        if (nearbyReports.length === 0) {
            return { hasAlert: false, message: 'Khu vực này an toàn' };
        }

        const totalDangerScore = nearbyReports.reduce(
            (sum, r) => sum + (CRIME_DANGER_WEIGHT[r.type as keyof typeof CRIME_DANGER_WEIGHT] ?? 1),
            0,
        );

        let alertLevel: 'low' | 'medium' | 'high' = 'low';
        if (totalDangerScore > 150) alertLevel = 'high';
        else if (totalDangerScore > 50) alertLevel = 'medium';

        return {
            hasAlert: true,
            alertLevel,
            totalReports: nearbyReports.length,
            totalDangerScore,
            reports: nearbyReports.map(r => ({
                id: r.id, title: r.title, type: r.type,
                lat: r.lat, lng: r.lng, address: r.address, createdAt: r.createdAt,
            })),
        };
    }
}
