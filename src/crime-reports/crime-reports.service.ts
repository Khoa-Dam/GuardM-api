import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrimeReport } from './entities/crime-report.entity';
import { ReportVote } from './entities/report-vote.entity';
import { CreateCrimeReportDto } from './dtos/create-crime-report.dto';
import { UpdateCrimeReportDto } from './dtos/update-crime-report.dto';
import { CrimeType } from '../enums/crime-type.enum';
import { VerificationLevel } from '../enums/verification-level.enum';
import { mapToCrimeReportResponse, CrimeReportResponse } from './dtos/crime-report-response.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { TrustScoreService } from './trust-score.service';
import { CRIME_DANGER_WEIGHT } from '../shared/crime-types.constants';
import { kmToDegrees } from '../shared/geo.utils';
import {
    ReportCreatedEvent,
    ReportUpdatedEvent,
    ReportDeletedEvent,
} from './events/crime-report.events';

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
    private readonly logger = new Logger(CrimeReportsService.name);

    constructor(
        @InjectRepository(CrimeReport)
        private crimeReportRepository: Repository<CrimeReport>,
        @InjectRepository(ReportVote)
        private reportVoteRepository: Repository<ReportVote>,
        private readonly cloudinaryService: CloudinaryService,
        private readonly trustScoreService: TrustScoreService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async create(reporterId: string, createReportDto: CreateCrimeReportDto): Promise<CrimeReportResponse> {
        if (!createReportDto.title && !createReportDto.description) {
            throw new BadRequestException('Either title or description must be provided');
        }
        if (!createReportDto.lat && !createReportDto.lng && !createReportDto.address) {
            throw new BadRequestException('Either coordinates (lat/lng) or address must be provided');
        }

        let severity = createReportDto.severity;
        if ((severity === undefined || severity === null) && createReportDto.type) {
            severity = this.trustScoreService.getDefaultSeverityByType(createReportDto.type);
        }

        const report = this.crimeReportRepository.create({
            ...createReportDto,
            reporterId,
            severity: severity || 1,
        });

        const savedReport = await this.crimeReportRepository.save(report);

        if (savedReport.lat && savedReport.lng) {
            await this.updateGeom(savedReport.id, savedReport.lat, savedReport.lng);
        }

        const trustScore = this.trustScoreService.calculate(savedReport);
        const verificationLevel = this.trustScoreService.getVerificationLevel(trustScore);

        await this.crimeReportRepository.update(savedReport.id, { trustScore, verificationLevel });

        const updatedReport = await this.crimeReportRepository.findOne({ where: { id: savedReport.id } });
        if (!updatedReport) throw new NotFoundException('Crime report not found after update');

        const response = mapToCrimeReportResponse(updatedReport);

        this.eventEmitter.emit('report.created', new ReportCreatedEvent(response));

        return response;
    }

    async findAll(type?: CrimeType): Promise<CrimeReportResponse[]> {
        const where = type ? { type } : {};
        const reports = await this.crimeReportRepository.find({
            where,
            order: { createdAt: 'DESC' },
            relations: ['reporter'],
        });
        return reports.map(mapToCrimeReportResponse);
    }

    async findByType(type: CrimeType): Promise<CrimeReportResponse[]> {
        return this.findAll(type);
    }

    async findOne(id: string): Promise<CrimeReportResponse> {
        const report = await this.crimeReportRepository.findOne({ where: { id }, relations: ['reporter'] });
        if (!report) throw new NotFoundException('Crime report not found');
        return mapToCrimeReportResponse(report);
    }

    async findByDistrict(district: string): Promise<CrimeReportResponse[]> {
        const reports = await this.crimeReportRepository.find({
            where: { district },
            order: { createdAt: 'DESC' },
            relations: ['reporter'],
        });
        return reports.map(mapToCrimeReportResponse);
    }

    async findByCity(province: string): Promise<CrimeReportResponse[]> {
        const reports = await this.crimeReportRepository.find({
            where: { province },
            order: { createdAt: 'DESC' },
            relations: ['reporter'],
        });
        return reports.map(mapToCrimeReportResponse);
    }

    async findByReporter(reporterId: string): Promise<CrimeReportResponse[]> {
        const reports = await this.crimeReportRepository.find({
            where: { reporterId },
            order: { createdAt: 'DESC' },
            relations: ['reporter'],
        });
        return reports.map(mapToCrimeReportResponse);
    }

    async getHeatmapData(): Promise<CrimeHeatmapData[]> {
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

    async getStatistics() {
        const total        = await this.crimeReportRepository.count();
        const activeAlerts = await this.crimeReportRepository.count({ where: { status: 0 } });
        const highSeverity = await this.crimeReportRepository.count({ where: { severity: 4 } });

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
            activeAlerts,
            highSeverity,
            byType:     byType.map(i => ({ type: i.type, count: parseInt(i.count) })),
            byDistrict: byDistrict.map(i => ({ district: i.district, count: parseInt(i.count) })),
        };
    }

    async verifyReport(id: string, adminId: string): Promise<CrimeReportResponse> {
        const report = await this.crimeReportRepository.findOne({ where: { id } });
        if (!report) throw new NotFoundException('Crime report not found');

        await this.crimeReportRepository.update(id, {
            verificationLevel: VerificationLevel.CONFIRMED,
            trustScore: 100,
            verifiedBy: adminId,
            verifiedAt: new Date(),
        });

        const updatedReport = await this.crimeReportRepository.findOne({ where: { id } });
        if (!updatedReport) throw new NotFoundException('Crime report not found after update');
        return mapToCrimeReportResponse(updatedReport);
    }

    async updateReport(id: string, userId: string, updateDto: UpdateCrimeReportDto): Promise<CrimeReportResponse> {
        const report = await this.crimeReportRepository.findOne({ where: { id } });
        if (!report) throw new NotFoundException('Crime report not found');
        if (report.reporterId !== userId) throw new BadRequestException('Không thể chỉnh sửa báo cáo của người khác');

        if (updateDto.type && updateDto.severity === undefined) {
            updateDto.severity = this.trustScoreService.getDefaultSeverityByType(updateDto.type);
        }

        if (updateDto.attachments !== undefined) {
            const removedUrls = (report.attachments || []).filter(url => !updateDto.attachments!.includes(url));
            if (removedUrls.length > 0) {
                await Promise.all(
                    removedUrls.map(url =>
                        this.cloudinaryService.deleteImageByUrl(url).catch(err => {
                            this.logger.error(`Failed to delete Cloudinary asset: ${url}`, err.stack);
                        }),
                    ),
                );
            }
        }

        const mergedReport = this.crimeReportRepository.merge(report, updateDto);
        const savedReport  = await this.crimeReportRepository.save(mergedReport);

        if (savedReport.lat && savedReport.lng) {
            await this.updateGeom(savedReport.id, savedReport.lat, savedReport.lng);
        }

        const trustScore = this.trustScoreService.calculate(savedReport);
        const verificationLevel = this.trustScoreService.getVerificationLevel(trustScore);
        await this.crimeReportRepository.update(savedReport.id, { trustScore, verificationLevel });

        const finalReport = await this.crimeReportRepository.findOne({ where: { id: savedReport.id } });
        if (!finalReport) throw new NotFoundException('Crime report not found after update');

        const response = mapToCrimeReportResponse(finalReport);
        this.eventEmitter.emit('report.updated', new ReportUpdatedEvent(response));
        return response;
    }

    async deleteReport(id: string, userId: string): Promise<void> {
        const report = await this.crimeReportRepository.findOne({ where: { id } });
        if (!report) throw new NotFoundException('Crime report not found');
        if (report.reporterId !== userId) throw new BadRequestException('Không thể xóa báo cáo của người khác');

        if (report.attachments && report.attachments.length > 0) {
            await Promise.all(
                report.attachments.map(url =>
                    this.cloudinaryService.deleteImageByUrl(url).catch(err => {
                        this.logger.error(`Failed to delete Cloudinary asset for report ${id}`, err.stack);
                    }),
                ),
            );
        }

        await this.crimeReportRepository.delete(id);
        this.eventEmitter.emit('report.deleted', new ReportDeletedEvent(id));
    }

    async findByLocation(lat: number, lng: number, radiusKm = 5): Promise<CrimeReport[]> {
        return this.crimeReportRepository
            .createQueryBuilder('report')
            .where(`ST_DWithin(
                geom::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :radius
            )`, { lat, lng, radius: radiusKm * 1000 })
            .orderBy('report.createdAt', 'DESC')
            .limit(50)
            .getMany();
    }

    async getNearbyAlert(lat: number, lng: number, radiusKm = 5) {
        const nearbyReports = await this.findByLocation(lat, lng, radiusKm);

        if (nearbyReports.length === 0) {
            return { hasAlert: false, message: 'Khu vực này an toàn' };
        }

        const totalDangerScore = nearbyReports.reduce((sum, r) => {
            return sum + (CRIME_DANGER_WEIGHT[r.type as keyof typeof CRIME_DANGER_WEIGHT] ?? 1);
        }, 0);

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

    async recalculateAllTrustScores(): Promise<void> {
        const reports = await this.crimeReportRepository.find();
        for (const report of reports) {
            const trustScore = this.trustScoreService.calculate(report);
            const verificationLevel = this.trustScoreService.getVerificationLevel(trustScore);
            await this.crimeReportRepository.update(report.id, { trustScore, verificationLevel });
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private async updateGeom(id: string, lat: number, lng: number): Promise<void> {
        await this.crimeReportRepository.query(
            `UPDATE crime_reports SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326) WHERE id = $3`,
            [lng, lat, id],
        );
    }
}
