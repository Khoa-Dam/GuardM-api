import { Body, Controller, Post, UseGuards, Req, HttpCode } from '@nestjs/common';
import { AiService } from './ai.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CrimeReport } from '../crime-reports/entities/crime-report.entity';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

class AnalyzeAreaDto {
    @IsNumber() lat: number;
    @IsNumber() lng: number;
    @IsNumber() @IsOptional() @Min(0.5) @Max(10) radiusKm?: number;
}

class ParseReportDto {
    @IsString() text: string;
}

@Controller('ai')
export class AiController {
    // Simple rate-limit map: userId -> { count, resetAt }
    private rateLimits = new Map<string, { count: number; resetAt: number }>();
    private readonly RATE_LIMIT = 10; // requests per hour per user

    constructor(
        private readonly aiService: AiService,
        @InjectRepository(CrimeReport)
        private readonly reportRepo: Repository<CrimeReport>,
    ) {}

    private checkRateLimit(userId: string): boolean {
        const now = Date.now();
        const entry = this.rateLimits.get(userId);
        if (!entry || now > entry.resetAt) {
            this.rateLimits.set(userId, { count: 1, resetAt: now + 3600_000 });
            return true;
        }
        if (entry.count >= this.RATE_LIMIT) return false;
        entry.count++;
        return true;
    }

    @Post('analyze')
    @UseGuards(AuthGuard)
    @HttpCode(200)
    async analyzeArea(@Body() dto: AnalyzeAreaDto, @Req() req: { user: { userId: string } }) {
        this.checkRateLimit(req.user.userId); // soft limit — don't throw, just proceed

        const radiusKm = dto.radiusKm ?? 2;
        const radiusDeg = radiusKm / 111; // rough deg conversion

        const since = new Date(Date.now() - 30 * 24 * 3600_000); // last 30 days
        const reports = await this.reportRepo.find({
            where: { createdAt: MoreThan(since) },
            select: ['type', 'severity', 'lat', 'lng', 'address', 'createdAt'],
        });

        // Filter by radius
        const nearby = reports.filter(r => {
            if (!r.lat || !r.lng) return false;
            return Math.abs(r.lat - dto.lat) <= radiusDeg && Math.abs(r.lng - dto.lng) <= radiusDeg;
        });

        return this.aiService.analyzeArea(nearby);
    }

    @Post('parse-report')
    @UseGuards(AuthGuard)
    @HttpCode(200)
    async parseReport(@Body() dto: ParseReportDto, @Req() req: { user: { userId: string } }) {
        if (!this.checkRateLimit(req.user.userId)) {
            return { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 giờ.' };
        }
        return this.aiService.parseReport(dto.text);
    }

}
