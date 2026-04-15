import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScraperService } from './scraper.service';

@Injectable()
export class ScraperCronService {
    private readonly logger = new Logger(ScraperCronService.name);
    private isRunning = false;

    constructor(private readonly scraperService: ScraperService) {}

    /** Runs every day at 2:00 AM (Asia/Ho_Chi_Minh) */
    @Cron('0 2 * * *', { name: 'daily-wanted-criminals-scraper', timeZone: 'Asia/Ho_Chi_Minh' })
    async handleDailyScraping() {
        if (this.isRunning) {
            this.logger.warn('Previous scraping job still running, skipping...');
            return;
        }

        this.isRunning = true;
        this.logger.log('Starting daily wanted criminals scraping job...');

        try {
            const maxPages = parseInt(process.env.SCRAPER_DAILY_PAGES || '10', 10);
            // scrapeWantedCriminals already persists each record while scraping
            const criminals = await this.scraperService.scrapeWantedCriminals(maxPages);
            this.logger.log(`Daily scraping completed. Processed: ${criminals.length}`);
        } catch (error) {
            this.logger.error('Daily scraping job error:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /** Runs every Sunday at 3:00 AM (Asia/Ho_Chi_Minh) for deeper scrape */
    @Cron('0 3 * * 0', { name: 'weekly-full-scraper', timeZone: 'Asia/Ho_Chi_Minh' })
    async handleWeeklyFullScraping() {
        if (this.isRunning) {
            this.logger.warn('Previous scraping job still running, skipping weekly job...');
            return;
        }

        this.isRunning = true;
        this.logger.log('Starting weekly full wanted criminals scraping job...');

        try {
            const maxPages = parseInt(process.env.SCRAPER_WEEKLY_PAGES || '50', 10);
            const criminals = await this.scraperService.scrapeWantedCriminals(maxPages);
            this.logger.log(`Weekly scraping completed. Processed: ${criminals.length}`);
        } catch (error) {
            this.logger.error('Weekly scraping job error:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            dailySchedule: '2:00 AM (Asia/Ho_Chi_Minh)',
            weeklySchedule: '3:00 AM Sunday (Asia/Ho_Chi_Minh)',
        };
    }
}
