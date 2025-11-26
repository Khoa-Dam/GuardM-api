import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CrimeReport } from './entities/crime-report.entity';
import { ReportVote, VoteType } from './entities/report-vote.entity';
import { CreateCrimeReportDto } from './dtos/create-crime-report.dto';
import { UpdateCrimeReportDto } from './dtos/update-crime-report.dto';
import { CrimeType } from '../enums/crime-type.enum';
import { VerificationLevel } from '../enums/verification-level.enum';
import { mapToCrimeReportResponse, CrimeReportResponse } from './dtos/crime-report-response.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

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
    ) { }

    private getDefaultSeverityByType(type: CrimeType): number {
        const dangerLevels: Record<string, number> = {
            'giet_nguoi': 5,
            'bat_coc': 5,
            'truy_na': 4,
            'cuop_giat': 3,
            'de_doa': 2,
            'nghi_pham': 2,
            'dang_ngo': 1,
            'trom_cap': 1,
        };

        return dangerLevels[type] || 1;
    }

    /**
     * Calculate trust score for a report (0-100)
     * Based on: Evidence, Completeness, Time freshness, Community votes
     */
    private async calculateTrustScore(report: CrimeReport): Promise<number> {
        let score = 0;

        // 1. Evidence (25 points max) - Giảm từ 40 xuống 25
        if (report.attachments && report.attachments.length > 0) {
            score += 25; // Has attachments
        }

        // 2. Completeness (20 points max)
        let completenessScore = 0;
        if (report.title) completenessScore += 4;
        if (report.description) completenessScore += 5;
        if (report.type) completenessScore += 3;
        if (report.address) completenessScore += 4;
        if (report.lat && report.lng) completenessScore += 4;
        score += Math.min(completenessScore, 20);

        // 3. Time freshness (10 points max)
        const hoursSinceCreation = (Date.now() - report.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation < 24) {
            score += 10; // Very recent
        } else if (hoursSinceCreation < 72) {
            score += 7; // Recent
        } else if (hoursSinceCreation < 168) {
            score += 4; // Within a week
        }

        // 4. Community votes (45 points max) - Tăng từ 30 lên 45
        const voteScore = Math.min(
            (report.confirmationCount * 5) - (report.disputeCount * 10),
            45
        );
        score += Math.max(voteScore, 0);

        return Math.min(Math.max(score, 0), 100); // Clamp between 0-100
    }

    /**
     * Get verification level based on trust score
     */
    private getVerificationLevel(trustScore: number): VerificationLevel {
        if (trustScore >= 85) return VerificationLevel.CONFIRMED;
        if (trustScore >= 70) return VerificationLevel.VERIFIED;
        if (trustScore >= 40) return VerificationLevel.PENDING;
        return VerificationLevel.UNVERIFIED;
    }

    async create(reporterId: string, createReportDto: CreateCrimeReportDto): Promise<CrimeReportResponse> {
        // Validate: must have at least title or description
        if (!createReportDto.title && !createReportDto.description) {
            throw new BadRequestException('Either title or description must be provided');
        }

        // Validate: must have location (either lat/lng or address)
        if (!createReportDto.lat && !createReportDto.lng && !createReportDto.address) {
            throw new BadRequestException('Either coordinates (lat/lng) or address must be provided');
        }

        // Calculate severity based on crime type if not provided
        let severity = createReportDto.severity;
        if ((severity === undefined || severity === null) && createReportDto.type) {
            severity = this.getDefaultSeverityByType(createReportDto.type);
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

        // Calculate and update trust score
        const trustScore = await this.calculateTrustScore(savedReport);
        const verificationLevel = this.getVerificationLevel(trustScore);

        await this.crimeReportRepository.update(savedReport.id, {
            trustScore,
            verificationLevel,
        });

        // Reload to get updated fields
        const updatedReport = await this.crimeReportRepository.findOne({
            where: { id: savedReport.id },
        });

        if (!updatedReport) {
            throw new NotFoundException('Crime report not found after update');
        }

        return mapToCrimeReportResponse(updatedReport);
    }

    async findAll(type?: CrimeType): Promise<CrimeReportResponse[]> {
        const where = type ? { type } : {};
        const reports = await this.crimeReportRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });
        return reports.map(mapToCrimeReportResponse);
    }

    async findByType(type: CrimeType): Promise<CrimeReportResponse[]> {
        return this.findAll(type);
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

        // Active alerts (status = 0)
        const activeAlerts = await this.crimeReportRepository.count({
            where: { status: 0 },
        });

        // High severity (severity >= 4)
        const highSeverity = await this.crimeReportRepository.count({
            where: { severity: 4 },
        });

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

    /**
     * Admin manually verify a report
     */
    async verifyReport(id: string, adminId: string): Promise<CrimeReportResponse> {
        const report = await this.crimeReportRepository.findOne({ where: { id } });
        if (!report) {
            throw new NotFoundException('Crime report not found');
        }

        await this.crimeReportRepository.update(id, {
            verificationLevel: VerificationLevel.CONFIRMED,
            trustScore: 100, // Admin verification = 100%
            verifiedBy: adminId,
            verifiedAt: new Date(),
        });

        const updatedReport = await this.crimeReportRepository.findOne({ where: { id } });
        if (!updatedReport) {
            throw new NotFoundException('Crime report not found after update');
        }
        return mapToCrimeReportResponse(updatedReport);
    }

    /**
     * User confirm a report (community verification)
     */
    async confirmReport(id: string, userId: string): Promise<CrimeReportResponse> {
        const report = await this.crimeReportRepository.findOne({ where: { id } });
        if (!report) {
            throw new NotFoundException('Crime report not found');
        }

        // Prevent user from confirming their own report
        if (report.reporterId === userId) {
            throw new BadRequestException('Không thể xác nhận báo cáo của chính mình');
        }

        // Check if user has already voted 2 times for this report
        const existingVotes = await this.reportVoteRepository.count({
            where: { userId, reportId: id },
        });

        if (existingVotes >= 2) {
            throw new BadRequestException('Bạn đã vote tối đa 2 lần cho báo cáo này');
        }

        // Check if user has already confirmed this report
        const existingConfirm = await this.reportVoteRepository.findOne({
            where: { userId, reportId: id, voteType: VoteType.CONFIRM },
        });

        if (existingConfirm) {
            throw new BadRequestException('Bạn đã xác nhận báo cáo này rồi');
        }

        // Save vote to database
        const vote = this.reportVoteRepository.create({
            userId,
            reportId: id,
            voteType: VoteType.CONFIRM,
        });
        await this.reportVoteRepository.save(vote);

        // Increment confirmation count
        await this.crimeReportRepository.update(id, {
            confirmationCount: report.confirmationCount + 1,
        });

        // Recalculate trust score
        const updatedReport = await this.crimeReportRepository.findOne({ where: { id } });
        if (!updatedReport) {
            throw new NotFoundException('Crime report not found');
        }

        const trustScore = await this.calculateTrustScore(updatedReport);
        const verificationLevel = this.getVerificationLevel(trustScore);

        await this.crimeReportRepository.update(id, {
            trustScore,
            verificationLevel,
        });

        const finalReport = await this.crimeReportRepository.findOne({ where: { id } });
        if (!finalReport) {
            throw new NotFoundException('Crime report not found after update');
        }

        return mapToCrimeReportResponse(finalReport);
    }

    async updateReport(id: string, userId: string, updateDto: UpdateCrimeReportDto): Promise<CrimeReportResponse> {
        const report = await this.crimeReportRepository.findOne({ where: { id } });
        if (!report) {
            throw new NotFoundException('Crime report not found');
        }

        if (report.reporterId !== userId) {
            throw new BadRequestException('Không thể chỉnh sửa báo cáo của người khác');
        }

        if (updateDto.type && updateDto.severity === undefined) {
            updateDto.severity = this.getDefaultSeverityByType(updateDto.type);
        }

        // Handle attachment deletion from Cloudinary
        // If attachments field is provided (even empty array), compare with old attachments
        if (updateDto.attachments !== undefined) {
            const oldAttachments = report.attachments || [];
            const newAttachments = updateDto.attachments || [];

            // Find URLs that were removed (exist in old but not in new)
            const removedUrls = oldAttachments.filter(url => !newAttachments.includes(url));

            // Delete removed attachments from Cloudinary
            if (removedUrls.length > 0) {
                await Promise.all(
                    removedUrls.map(url =>
                        this.cloudinaryService.deleteImageByUrl(url).catch(error => {
                            this.logger.error(`Failed to delete Cloudinary asset: ${url}`, error.stack);
                        }),
                    ),
                );
                this.logger.log(`Deleted ${removedUrls.length} attachments from Cloudinary for report ${id}`);
            }
        }

        const mergedReport = this.crimeReportRepository.merge(report, updateDto);
        const savedReport = await this.crimeReportRepository.save(mergedReport);

        if (savedReport.lat && savedReport.lng) {
            await this.crimeReportRepository.query(
                `UPDATE crime_reports 
                 SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326) 
                 WHERE id = $3`,
                [savedReport.lng, savedReport.lat, savedReport.id]
            );
        }

        const trustScore = await this.calculateTrustScore(savedReport);
        const verificationLevel = this.getVerificationLevel(trustScore);

        await this.crimeReportRepository.update(savedReport.id, {
            trustScore,
            verificationLevel,
        });

        const finalReport = await this.crimeReportRepository.findOne({ where: { id: savedReport.id } });
        if (!finalReport) {
            throw new NotFoundException('Crime report not found after update');
        }

        return mapToCrimeReportResponse(finalReport);
    }

    async findByReporter(reporterId: string): Promise<CrimeReportResponse[]> {
        const reports = await this.crimeReportRepository.find({
            where: { reporterId },
            order: { createdAt: 'DESC' },
        });

        return reports.map(mapToCrimeReportResponse);
    }

    async deleteReport(id: string, userId: string): Promise<void> {
        const report = await this.crimeReportRepository.findOne({ where: { id } });
        if (!report) {
            throw new NotFoundException('Crime report not found');
        }

        if (report.reporterId !== userId) {
            throw new BadRequestException('Không thể xóa báo cáo của người khác');
        }

        if (report.attachments && report.attachments.length > 0) {
            await Promise.all(
                report.attachments.map(url =>
                    this.cloudinaryService.deleteImageByUrl(url).catch(error => {
                        this.logger.error(`Failed to delete Cloudinary asset for report ${id}`, error.stack);
                    }),
                ),
            );
        }

        await this.crimeReportRepository.delete(id);
    }

    /**
     * User dispute a report (community verification)
     */
    async disputeReport(id: string, userId: string): Promise<CrimeReportResponse> {
        const report = await this.crimeReportRepository.findOne({ where: { id } });
        if (!report) {
            throw new NotFoundException('Crime report not found');
        }

        // Prevent user from disputing their own report
        if (report.reporterId === userId) {
            throw new BadRequestException('Không thể tranh cãi báo cáo của chính mình');
        }

        // Check if user has already voted 2 times for this report
        const existingVotes = await this.reportVoteRepository.count({
            where: { userId, reportId: id },
        });

        if (existingVotes >= 2) {
            throw new BadRequestException('Bạn đã vote tối đa 2 lần cho báo cáo này');
        }

        // Check if user has already disputed this report
        const existingDispute = await this.reportVoteRepository.findOne({
            where: { userId, reportId: id, voteType: VoteType.DISPUTE },
        });

        if (existingDispute) {
            throw new BadRequestException('Bạn đã báo sai báo cáo này rồi');
        }

        // Save vote to database
        const vote = this.reportVoteRepository.create({
            userId,
            reportId: id,
            voteType: VoteType.DISPUTE,
        });
        await this.reportVoteRepository.save(vote);

        // Increment dispute count
        await this.crimeReportRepository.update(id, {
            disputeCount: report.disputeCount + 1,
        });

        // Recalculate trust score
        const updatedReport = await this.crimeReportRepository.findOne({ where: { id } });
        if (!updatedReport) {
            throw new NotFoundException('Crime report not found');
        }

        const trustScore = await this.calculateTrustScore(updatedReport);
        const verificationLevel = this.getVerificationLevel(trustScore);

        await this.crimeReportRepository.update(id, {
            trustScore,
            verificationLevel,
        });

        const finalReport = await this.crimeReportRepository.findOne({ where: { id } });
        if (!finalReport) {
            throw new NotFoundException('Crime report not found after update');
        }

        return mapToCrimeReportResponse(finalReport);
    }

    /**
     * Get vote status of a user for a specific report
     */
    async getVoteStatus(reportId: string, userId: string): Promise<{
        hasConfirmed: boolean;
        hasDisputed: boolean;
        voteCount: number;
        canVote: boolean;
        isOwner: boolean;
    }> {
        const report = await this.crimeReportRepository.findOne({ where: { id: reportId } });
        if (!report) {
            throw new NotFoundException('Crime report not found');
        }

        const votes = await this.reportVoteRepository.find({
            where: { userId, reportId },
        });

        const hasConfirmed = votes.some(vote => vote.voteType === VoteType.CONFIRM);
        const hasDisputed = votes.some(vote => vote.voteType === VoteType.DISPUTE);
        const voteCount = votes.length;
        const canVote = voteCount < 2;
        const isOwner = report.reporterId === userId;

        return {
            hasConfirmed,
            hasDisputed,
            voteCount,
            canVote,
            isOwner,
        };
    }

    /**
     * Recalculate trust score for all reports (can be run as a cron job)
     */
    async recalculateAllTrustScores(): Promise<void> {
        const reports = await this.crimeReportRepository.find();

        for (const report of reports) {
            const trustScore = await this.calculateTrustScore(report);
            const verificationLevel = this.getVerificationLevel(trustScore);

            await this.crimeReportRepository.update(report.id, {
                trustScore,
                verificationLevel,
            });
        }
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
