import { Controller, Post, Query, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ScraperService } from './scraper.service';
import { ScraperCronService } from './scraper-cron.service';
import { WeatherScraperService } from './weather-scraper.service';
import { WeatherScraperCronService } from './weather-scraper-cron.service';
import { WeatherNewsService } from '../weather-news/weather-news.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/enums/role.enum';

@ApiTags('scraper')
@Controller('scraper')
export class ScraperController {
    constructor(
        private readonly scraperService: ScraperService,
        private readonly scraperCronService: ScraperCronService,
        private readonly weatherScraperService: WeatherScraperService,
        private readonly weatherScraperCronService: WeatherScraperCronService,
        private readonly weatherNewsService: WeatherNewsService,
    ) { }

    /**
     * Trigger scraping wanted criminals from Bộ Công An website
     * Admin only endpoint
     */
    @Post('wanted-criminals')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.Admin)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Trigger scraping wanted criminals from Bộ Công An website (Admin only)' })
    @ApiQuery({ name: 'pages', description: 'Number of pages to scrape', required: false })
    @ApiResponse({ status: 200, description: 'Scraping completed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async scrapeWantedCriminals(@Query('pages') pages?: string) {
        const maxPages = pages ? parseInt(pages, 10) : 5;
        const criminals = await this.scraperService.scrapeWantedCriminals(maxPages);

        return {
            success: true,
            count: criminals.length,
            criminals,
            message: `Đã scrape ${criminals.length} đối tượng từ trang Bộ Công An`,
        };
    }

    /**
     * Trigger scraping weather news from NCHMF website
     * Admin only endpoint
     */
    @Post('weather-news')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.Admin)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Trigger scraping weather news from NCHMF website (Admin only)' })
    @ApiResponse({ status: 200, description: 'Scraping completed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    async scrapeWeatherNews() {
        const scrapedNews = await this.weatherScraperService.scrapeWeatherNews();

        // Import to database
        let imported = 0;
        let updated = 0;
        let errors = 0;

        let deletedCount = 0;

        for (const news of scrapedNews) {
            try {
                // Check if exists by sourceUrl + type
                let isNew = true;
                if (news.sourceUrl && news.type) {
                    const existing = await this.weatherNewsService.findAll();
                    const found = existing.find(n => n.sourceUrl === news.sourceUrl && n.type === news.type);
                    if (found) {
                        isNew = false;
                    }
                }

                // Delete old duplicates (same title but different sourceUrl) before creating/updating
                const deleted = await this.weatherNewsService.deleteOldDuplicates(news);
                deletedCount += deleted;

                await this.weatherNewsService.createOrUpdate(news);
                if (isNew) {
                    imported++;
                } else {
                    updated++;
                }
            } catch (error) {
                errors++;
            }
        }

        return {
            success: true,
            count: scrapedNews.length,
            imported,
            updated,
            deleted: deletedCount,
            errors,
            news: scrapedNews,
            message: `Đã scrape ${scrapedNews.length} tin thời tiết từ trang NCHMF (${imported} mới, ${updated} cập nhật, ${deletedCount} tin cũ đã xóa)`,
        };
    }

    /**
     * Get cron job status for all scrapers
     */
    @Get('status')
    @ApiOperation({ summary: 'Get scraper cron job status' })
    @ApiResponse({ status: 200, description: 'Returns cron job status for all scrapers' })
    async getStatus() {
        return {
            wantedCriminals: this.scraperCronService.getStatus(),
            weatherNews: this.weatherScraperCronService.getStatus(),
        };
    }

    /**
     * Get weather scraper status only
     */
    @Get('weather-status')
    @ApiOperation({ summary: 'Get weather news scraper cron job status' })
    @ApiResponse({ status: 200, description: 'Returns weather scraper cron job status' })
    async getWeatherStatus() {
        return this.weatherScraperCronService.getStatus();
    }
}

