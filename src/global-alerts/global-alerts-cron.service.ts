import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { GdeltService } from './gdelt.service';
import { RssService } from './rss.service';
import { GlobalAlert } from './entities/global-alert.entity';

@Injectable()
export class GlobalAlertsCronService {
    private readonly logger = new Logger(GlobalAlertsCronService.name);
    private isRunning = false;

    constructor(
        private readonly gdelt: GdeltService,
        private readonly rss: RssService,
        @InjectRepository(GlobalAlert)
        private readonly repo: Repository<GlobalAlert>,
    ) {}

    @Cron('0 */15 * * * *')
    async runFetch() {
        if (this.isRunning) {
            this.logger.log('Global alerts fetch already running, skipping');
            return;
        }
        this.isRunning = true;
        try {
            const [gdeltCount, rssCount] = await Promise.all([
                Promise.resolve(0), // GDELT API unreliable — disabled
                this.rss.fetch(),
            ]);
            this.logger.log(`Global alerts synced — GDELT: ${gdeltCount}, RSS: ${rssCount}`);

            // Cleanup old alerts (older than 7 days)
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 7);
            const deleted = await this.repo.delete({ publishedAt: LessThan(cutoff) });
            if ((deleted.affected ?? 0) > 0) {
                this.logger.log(`Deleted ${deleted.affected} old global alerts`);
            }
        } catch (err) {
            this.logger.error('Global alerts cron error', err);
        } finally {
            this.isRunning = false;
        }
    }

    async triggerManual(): Promise<{ gdelt: number; rss: number }> {
        const rss = await this.rss.fetch();
        return { gdelt: 0, rss };
    }
}
