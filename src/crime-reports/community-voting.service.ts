import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrimeReport } from './entities/crime-report.entity';
import { ReportVote, VoteType } from './entities/report-vote.entity';
import { CrimeReportResponse, mapToCrimeReportResponse } from './dtos/crime-report-response.dto';
import { TrustScoreService } from './trust-score.service';

@Injectable()
export class CommunityVotingService {
    constructor(
        @InjectRepository(CrimeReport)
        private readonly reportRepo: Repository<CrimeReport>,
        @InjectRepository(ReportVote)
        private readonly voteRepo: Repository<ReportVote>,
        private readonly trustScoreService: TrustScoreService,
    ) {}

    async confirmReport(reportId: string, userId: string): Promise<CrimeReportResponse> {
        const report = await this.assertVoteEligible(reportId, userId, VoteType.CONFIRM);

        await this.voteRepo.save(this.voteRepo.create({ userId, reportId, voteType: VoteType.CONFIRM }));
        await this.reportRepo.update(reportId, { confirmationCount: report.confirmationCount + 1 });

        return this.recalculateAndReturn(reportId);
    }

    async disputeReport(reportId: string, userId: string): Promise<CrimeReportResponse> {
        const report = await this.assertVoteEligible(reportId, userId, VoteType.DISPUTE);

        await this.voteRepo.save(this.voteRepo.create({ userId, reportId, voteType: VoteType.DISPUTE }));
        await this.reportRepo.update(reportId, { disputeCount: report.disputeCount + 1 });

        return this.recalculateAndReturn(reportId);
    }

    async getVoteStatus(reportId: string, userId: string) {
        const report = await this.reportRepo.findOne({ where: { id: reportId } });
        if (!report) throw new NotFoundException('Crime report not found');

        const votes = await this.voteRepo.find({ where: { userId, reportId } });

        return {
            hasConfirmed: votes.some(v => v.voteType === VoteType.CONFIRM),
            hasDisputed:  votes.some(v => v.voteType === VoteType.DISPUTE),
            voteCount:    votes.length,
            canVote:      votes.length < 2,
            isOwner:      report.reporterId === userId,
        };
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private async assertVoteEligible(reportId: string, userId: string, voteType: VoteType): Promise<CrimeReport> {
        const report = await this.reportRepo.findOne({ where: { id: reportId } });
        if (!report) throw new NotFoundException('Crime report not found');

        if (report.reporterId === userId) {
            throw new BadRequestException('Không thể vote báo cáo của chính mình');
        }

        const existingVotes = await this.voteRepo.count({ where: { userId, reportId } });
        if (existingVotes >= 2) {
            throw new BadRequestException('Bạn đã vote tối đa 2 lần cho báo cáo này');
        }

        const duplicate = await this.voteRepo.findOne({ where: { userId, reportId, voteType } });
        if (duplicate) {
            throw new BadRequestException(
                voteType === VoteType.CONFIRM ? 'Bạn đã xác nhận báo cáo này rồi' : 'Bạn đã báo sai báo cáo này rồi',
            );
        }

        return report;
    }

    private async recalculateAndReturn(reportId: string): Promise<CrimeReportResponse> {
        const report = await this.reportRepo.findOne({ where: { id: reportId } });
        if (!report) throw new NotFoundException('Crime report not found');

        const trustScore = this.trustScoreService.calculate(report);
        const verificationLevel = this.trustScoreService.getVerificationLevel(trustScore);

        await this.reportRepo.update(reportId, { trustScore, verificationLevel });

        const final = await this.reportRepo.findOne({ where: { id: reportId } });
        if (!final) throw new NotFoundException('Crime report not found after update');

        return mapToCrimeReportResponse(final);
    }
}
