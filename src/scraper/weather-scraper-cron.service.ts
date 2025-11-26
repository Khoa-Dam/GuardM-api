import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WeatherScraperService } from './weather-scraper.service';
import { WeatherNewsService } from '../weather-news/weather-news.service';

@Injectable()
export class WeatherScraperCronService {
    private readonly logger = new Logger(WeatherScraperCronService.name);
    private isRunning = false;
    private lastRunTime: Date | null = null;
    private lastRunStats: {
        totalScraped: number;
        newItems: number;
        updatedItems: number;
        errors: number;
    } | null = null;

    constructor(
        private readonly weatherScraperService: WeatherScraperService,
        private readonly weatherNewsService: WeatherNewsService,
    ) { }

    /**
     * Chạy scraping mỗi 2 giờ để check tin mới
     * Cron format: Every 2 hours
     * Có thể điều chỉnh interval trong .env: WEATHER_SCRAPER_INTERVAL
     * Mặc định: mỗi 2 giờ
     */
    @Cron(process.env.WEATHER_SCRAPER_INTERVAL || '0 0,2,4,6,8,10,12,14,16,18,20,22 * * *', {
        name: 'weather-news-scraper',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async handlePeriodicScraping() {
        if (this.isRunning) {
            this.logger.warn('Previous weather scraping job is still running, skipping...');
            return;
        }

        this.isRunning = true;
        this.lastRunTime = new Date();
        this.logger.log('🌦️  Starting periodic weather news scraping job...');

        try {
            // Scrape both tabs
            const scrapedNews = await this.weatherScraperService.scrapeWeatherNews();
            this.logger.log(`✅ Scraped ${scrapedNews.length} news items`);

            // Get existing news from database
            const existingNews = await this.weatherNewsService.findAll();

            // Import to database - only new items
            let newItems = 0;
            let updatedItems = 0;
            let errors = 0;

            let deletedCount = 0;

            for (const news of scrapedNews) {
                try {
                    // Check if exists by sourceUrl + type (same URL can appear in both tabs with different types)
                    let existing: any = null;

                    if (news.sourceUrl && news.type) {
                        existing = existingNews.find((n: any) => n.sourceUrl === news.sourceUrl && n.type === news.type);
                    }

                    // If not found by URL+type, try title + publishedDate + type
                    if (!existing && news.title && news.publishedDate && news.type) {
                        const newsDate = news.publishedDate;
                        existing = existingNews.find(
                            (n: any) =>
                                n.title === news.title &&
                                n.type === news.type &&
                                n.publishedDate &&
                                newsDate &&
                                Math.abs(n.publishedDate.getTime() - newsDate.getTime()) < 24 * 60 * 60 * 1000, // Within 24 hours
                        );
                    }

                    // Delete old duplicates (same normalized title but different sourceUrl) before processing
                    const deleted = await this.weatherNewsService.deleteOldDuplicates(news);
                    deletedCount += deleted;

                    if (existing) {
                        // Update existing - only if publishedDate is newer or content changed
                        const shouldUpdate =
                            !existing.publishedDate ||
                            !news.publishedDate ||
                            news.publishedDate.getTime() > existing.publishedDate.getTime() ||
                            existing.summary !== news.summary ||
                            existing.imageUrl !== news.imageUrl;

                        if (shouldUpdate) {
                            await this.weatherNewsService.createOrUpdate(news);
                            updatedItems++;
                            this.logger.log(`🔄 Updated: ${news.title.substring(0, 50)}...`);
                        }
                    } else {
                        // New item
                        await this.weatherNewsService.create(news);
                        newItems++;
                        this.logger.log(`✨ New: ${news.title.substring(0, 50)}...`);
                    }
                } catch (error: any) {
                    errors++;
                    this.logger.error(`✗ Error processing news item: ${error.message}`);
                }
            }

            // Save stats
            this.lastRunStats = {
                totalScraped: scrapedNews.length,
                newItems,
                updatedItems,
                errors,
            };

            this.logger.log('\n📊 Weather News Scraping Summary:');
            this.logger.log(`  Total scraped: ${scrapedNews.length}`);
            this.logger.log(`  New items: ${newItems}`);
            this.logger.log(`  Updated items: ${updatedItems}`);
            this.logger.log(`  Deleted old duplicates: ${deletedCount}`);
            this.logger.log(`  Errors: ${errors}`);

            // Log if new items found
            if (newItems > 0) {
                this.logger.log(`\n🎉 Found ${newItems} new weather news items!`);
            }
        } catch (error: any) {
            this.logger.error('❌ Weather scraping job error:', error.message);
            this.lastRunStats = {
                totalScraped: 0,
                newItems: 0,
                updatedItems: 0,
                errors: 1,
            };
        } finally {
            this.isRunning = false;
            this.logger.log('✅ Weather scraping job completed');
        }
    }

    /**
     * Chạy scraping mỗi 30 phút (nếu cần check thường xuyên hơn)
     * Cron format: Every 30 minutes
     * Uncomment và comment job trên nếu muốn chạy mỗi 30 phút
     */
    // @Cron('*/30 * * * *', {
    //     name: 'weather-news-scraper-frequent',
    //     timeZone: 'Asia/Ho_Chi_Minh',
    // })
    // async handleFrequentScraping() {
    //     await this.handlePeriodicScraping();
    // }

    /**
     * Get current scraping status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRunTime: this.lastRunTime,
            lastRunStats: this.lastRunStats,
            schedule: process.env.WEATHER_SCRAPER_INTERVAL || 'Every 2 hours',
            timeZone: 'Asia/Ho_Chi_Minh',
        };
    }
}
