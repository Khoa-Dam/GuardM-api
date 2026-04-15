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
import { CrimeReportAnalyticsService, CrimeHeatmapData, CrimeStatistics } from './crime-report-analytics.service';
import {
    ReportCreatedEvent,
    ReportUpdatedEvent,
    ReportDeletedEvent,
} from './events/crime-report.events';

// Re-export for backwards compatibility
export type { CrimeHeatmapData };

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
        private readonly analyticsService: CrimeReportAnalyticsService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    // ── Analytics delegation ──────────────────────────────────────────────────

    getHeatmapData(): Promise<CrimeHeatmapData[]> {
        return this.analyticsService.getHeatmapData();
    }

    getStatistics(): Promise<CrimeStatistics> {
        return this.analyticsService.getStatistics();
    }

    getNearbyAlert(lat: number, lng: number, radiusKm = 5) {
        return this.analyticsService.getNearbyAlert(lat, lng, radiusKm);
    }

    // ── Attachment processing ─────────────────────────────────────────────────

    /**
     * Upload multipart files + base64 strings to Cloudinary, keep plain URLs.
     * Rolls back already-uploaded assets if an error occurs mid-upload.
     */
    async processAttachments(
        files: Array<Express.Multer.File> = [],
        rawAttachments: string[] = [],
    ): Promise<string[]> {
        const uploadedPublicIds: string[] = [];
        const urls: string[] = [];

        try {
            if (files.length > 0) {
                const results = await Promise.all(files.map(f => this.cloudinaryService.uploadImage(f)));
                for (const r of results) {
                    if ('public_id' in r) uploadedPublicIds.push(r.public_id);
                    if ('secure_url' in r && r.secure_url) urls.push(r.secure_url);
                }
            }

            const base64Items = rawAttachments.filter(a => this.cloudinaryService.isBase64DataUrl(a));
            if (base64Items.length > 0) {
                const results = await Promise.all(
                    base64Items.map(b64 => this.cloudinaryService.uploadFromBase64(b64).catch(() => null)),
                );
                for (const r of results) {
                    if (!r) continue;
                    if ('public_id' in r) uploadedPublicIds.push(r.public_id);
                    if ('secure_url' in r && r.secure_url) urls.push(r.secure_url);
                }
            }

            const existingUrls = rawAttachments.filter(a => a && !this.cloudinaryService.isBase64DataUrl(a));
            urls.push(...existingUrls);

            return urls;
        } catch (error) {
            await Promise.all(
                uploadedPublicIds.map(id =>
                    this.cloudinaryService.deleteImage(id).catch(e =>
                        this.logger.error(`Rollback: failed to delete ${id}`, e.stack),
                    ),
                ),
            );
            throw error;
        }
    }

    // ── Write operations ──────────────────────────────────────────────────────

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
                        this.cloudinaryService.deleteImageByUrl(url).catch(err =>
                            this.logger.error(`Failed to delete Cloudinary asset: ${url}`, err.stack),
                        ),
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
                    this.cloudinaryService.deleteImageByUrl(url).catch(err =>
                        this.logger.error(`Failed to delete Cloudinary asset for report ${id}`, err.stack),
                    ),
                ),
            );
        }

        await this.crimeReportRepository.delete(id);
        this.eventEmitter.emit('report.deleted', new ReportDeletedEvent(id));
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

    // ── Read operations ───────────────────────────────────────────────────────

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

    async recalculateAllTrustScores(): Promise<void> {
        const reports = await this.crimeReportRepository.find();
        for (const report of reports) {
            const trustScore = this.trustScoreService.calculate(report);
            const verificationLevel = this.trustScoreService.getVerificationLevel(trustScore);
            await this.crimeReportRepository.update(report.id, { trustScore, verificationLevel });
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async updateGeom(id: string, lat: number, lng: number): Promise<void> {
        await this.crimeReportRepository.query(
            `UPDATE crime_reports SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326) WHERE id = $3`,
            [lng, lat, id],
        );
    }
}
