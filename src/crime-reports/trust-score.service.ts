import { Injectable } from '@nestjs/common';
import { CrimeReport } from './entities/crime-report.entity';
import { CrimeType } from '../enums/crime-type.enum';
import { VerificationLevel } from '../enums/verification-level.enum';
import { CRIME_DANGER_WEIGHT, weightToSeverity } from '../shared/crime-types.constants';

@Injectable()
export class TrustScoreService {
    /**
     * Calculate trust score for a report (0–100).
     * Pure function — no DB writes, no I/O side effects.
     */
    calculate(report: CrimeReport): number {
        let score = 0;

        // 1. Evidence (25 points max)
        if (report.attachments && report.attachments.length > 0) {
            score += 25;
        }

        // 2. Completeness (20 points max)
        let completeness = 0;
        if (report.title)       completeness += 4;
        if (report.description) completeness += 5;
        if (report.type)        completeness += 3;
        if (report.address)     completeness += 4;
        if (report.lat && report.lng) completeness += 4;
        score += Math.min(completeness, 20);

        // 3. Time freshness (10 points max)
        const hoursSince = (Date.now() - report.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24)       score += 10;
        else if (hoursSince < 72)  score += 7;
        else if (hoursSince < 168) score += 4;

        // 4. Community votes (45 points max)
        const voteScore = Math.min(
            (report.confirmationCount * 5) - (report.disputeCount * 10),
            45,
        );
        score += Math.max(voteScore, 0);

        return Math.min(Math.max(score, 0), 100);
    }

    getVerificationLevel(trustScore: number): VerificationLevel {
        if (trustScore >= 85) return VerificationLevel.CONFIRMED;
        if (trustScore >= 70) return VerificationLevel.VERIFIED;
        if (trustScore >= 40) return VerificationLevel.PENDING;
        return VerificationLevel.UNVERIFIED;
    }

    /** Default severity (1–5) for a crime type based on danger weight */
    getDefaultSeverityByType(type: CrimeType): number {
        const weight = CRIME_DANGER_WEIGHT[type as keyof typeof CRIME_DANGER_WEIGHT] ?? 2;
        return weightToSeverity(weight);
    }
}
