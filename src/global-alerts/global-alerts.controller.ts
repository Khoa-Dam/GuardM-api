import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { GlobalAlert } from './entities/global-alert.entity';
import { GlobalAlertsCronService } from './global-alerts-cron.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('global-alerts')
export class GlobalAlertsController {
    constructor(
        @InjectRepository(GlobalAlert)
        private readonly repo: Repository<GlobalAlert>,
        private readonly cronService: GlobalAlertsCronService,
    ) {}

    @Get()
    async list(
        @Query('limit') limitStr?: string,
        @Query('since') since?: string,
        @Query('category') category?: string,
        @Query('severity') severity?: string,
    ) {
        const limit = Math.min(parseInt(limitStr ?? '200', 10) || 200, 500);
        const sinceDate = since ? new Date(since) : (() => {
            const d = new Date();
            d.setHours(d.getHours() - 48);
            return d;
        })();

        const where: Record<string, unknown> = {
            publishedAt: MoreThanOrEqual(sinceDate),
        };
        if (category) where['category'] = category;
        if (severity) where['severity'] = severity;

        const alerts = await this.repo.find({
            where,
            order: { publishedAt: 'DESC' },
            take: limit,
        });

        return alerts;
    }

    // Admin-only manual trigger
    @Post('trigger')
    @UseGuards(AuthGuard)
    async trigger() {
        const result = await this.cronService.triggerManual();
        return { message: 'Fetch completed', ...result };
    }
}
