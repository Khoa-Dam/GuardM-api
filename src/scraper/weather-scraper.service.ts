import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { WeatherNews, WeatherNewsType } from '../weather-news/entities/weather-news.entity';

export interface ScrapedWeatherNews {
    type: WeatherNewsType;
    title: string;
    summary?: string;
    content?: string;
    imageUrl?: string;
    sourceUrl?: string;
    publishedDate?: Date;
    nextUpdateAt?: Date; // Tin phát tiếp theo lúc
    location?: string;
    severity?: string;
}

@Injectable()
export class WeatherScraperService {
    private readonly logger = new Logger(WeatherScraperService.name);
    private readonly baseUrl = 'https://www.nchmf.gov.vn/kttv';

    /**
     * Scrape weather news from both tabs: disaster warnings and weather forecasts
     */
    async scrapeWeatherNews(): Promise<ScrapedWeatherNews[]> {
        const allNews: ScrapedWeatherNews[] = [];

        try {
            // Scrape from single page (both tabs are on same page)
            // Scrape disaster warnings tab (from #left-col)
            this.logger.log('Scraping disaster warnings (Tin cảnh báo thiên tai) from #left-col...');
            const disasterWarnings = await this.scrapeTab(WeatherNewsType.DISASTER_WARNING);
            allNews.push(...disasterWarnings);
            this.logger.log(`Found ${disasterWarnings.length} disaster warnings`);

            // Scrape weather forecasts tab (from #center-col)
            this.logger.log('Scraping weather forecasts (Tin khí tượng thủy văn) from #center-col...');
            const weatherForecasts = await this.scrapeTab(WeatherNewsType.WEATHER_FORECAST);
            allNews.push(...weatherForecasts);
            this.logger.log(`Found ${weatherForecasts.length} weather forecasts`);

            // Remove duplicates based on sourceUrl + type (same URL can appear in both tabs with different types)
            const uniqueNews: ScrapedWeatherNews[] = [];
            const seenKeys = new Set<string>();

            for (const news of allNews) {
                // Create unique key: sourceUrl + type
                const uniqueKey = news.sourceUrl && news.type
                    ? `${news.sourceUrl}::${news.type}`
                    : news.title || '';

                if (!seenKeys.has(uniqueKey)) {
                    seenKeys.add(uniqueKey);
                    uniqueNews.push(news);
                }
            }

            this.logger.log(`Total scraped: ${allNews.length} items, unique: ${uniqueNews.length} items`);
            return uniqueNews;
        } catch (error) {
            this.logger.error(`Error scraping weather news: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Scrape a specific tab
     * Both tabs are on the same page but in different columns
     */
    private async scrapeTab(type: WeatherNewsType): Promise<ScrapedWeatherNews[]> {
        try {
            // Both tabs are on the same page, use main URL
            const url = `${this.baseUrl}/vi-VN/1/index.html`;

            const response = await axios.get(url, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                },
            });

            const $ = cheerio.load(response.data);
            const newsItems: ScrapedWeatherNews[] = [];

            // Select the correct column based on type
            // Tin cảnh báo thiên tai: #left-col
            // Tin khí tượng thủy văn: #center-col
            const columnSelector = type === WeatherNewsType.DISASTER_WARNING
                ? '#left-col'
                : '#center-col';

            const $column = $(columnSelector);
            if ($column.length === 0) {
                this.logger.warn(`Column ${columnSelector} not found for type ${type}`);
                return [];
            }

            // Find news items in the specific column
            // Only scrape items that contain the "new" icon (newest items)
            // Structure: ul.list-news > li with news items containing new.jpg icon
            for (const element of $column.find('ul.list-news li, ul.list-news-news li').toArray()) {
                const $li = $(element);

                // Check if this item has the "new" icon (only scrape newest items)
                const hasNewIcon = $li.find('img[src*="new.jpg"]').length > 0;

                if (!hasNewIcon) {
                    // Skip items without new icon (old items)
                    continue;
                }

                try {
                    const newsItem = await this.parseNewsItem($, $li, type);
                    if (newsItem && newsItem.title) {
                        newsItems.push(newsItem);
                    }
                } catch (error: any) {
                    this.logger.warn(`Error parsing news item: ${error.message}`);
                }
            }

            // Limit to latest 20 items per tab
            return newsItems.slice(0, 20);

        } catch (error) {
            this.logger.error(`Error scraping tab ${type}: ${error.message}`, error.stack);
            return [];
        }
    }

    /**
     * Parse a single news item element
     */
    private async parseNewsItem(
        $: cheerio.CheerioAPI,
        $element: cheerio.Cheerio<any>,
        type: WeatherNewsType,
        titleOverride?: string,
    ): Promise<ScrapedWeatherNews | null> {
        try {
            // Extract title
            const title = titleOverride ||
                $element.find('h1, h2, h3, h4, .title, .news-title, a[title]').first().text().trim() ||
                $element.find('a').first().text().trim();

            if (!title || title.length < 5) {
                return null;
            }

            // Extract link/source URL
            const linkElement = $element.find('a').first();
            let sourceUrl = linkElement.attr('href') || '';
            if (sourceUrl && !sourceUrl.startsWith('http')) {
                sourceUrl = sourceUrl.startsWith('/')
                    ? `https://www.nchmf.gov.vn${sourceUrl}`
                    : `${this.baseUrl}/${sourceUrl}`;
            }

            // Extract summary/description
            const summary = $element.find('.summary, .description, .excerpt, .intro, p').first().text().trim();

            // Extract image - priority: .thumb-news-nb img (actual thumbnail) > other img (skip new.jpg icon)
            let imageUrl = '';
            const thumbImage = $element.find('.thumb-news-nb img').first();
            if (thumbImage.length > 0) {
                imageUrl = thumbImage.attr('src') || thumbImage.attr('data-src') || '';
            } else {
                // Fallback: find first img that is not the "new.jpg" icon
                $element.find('img').each((_, img) => {
                    const src = $(img).attr('src') || '';
                    if (src && !src.includes('/images/new.jpg') && !src.includes('new.jpg')) {
                        imageUrl = src;
                        return false; // Break loop
                    }
                });
            }

            // Normalize URL
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = imageUrl.startsWith('/')
                    ? `https://www.nchmf.gov.vn${imageUrl}`
                    : `${this.baseUrl}/${imageUrl}`;
            }

            // Extract date from title first (title contains date like "(26/11/2025 17:01:00)")
            let publishedDate = this.parseDateFromTitle(title);

            // If not found in title, try to extract from element
            if (!publishedDate) {
                const dateText = $element.find('.date, .published-date, .time, time').first().text().trim() ||
                    $element.find('[class*="date"]').first().text().trim();
                publishedDate = this.parseDate(dateText);
            }

            // Extract location and severity from title
            const { location, severity } = this.extractLocationAndSeverity(title);

            // Clean title - remove date part at the end like "(26/11/2025 17:01:00)" or "(26/11/2025)"
            let cleanTitle = this.cleanText(title);
            cleanTitle = cleanTitle.replace(/\(\d{1,2}\/\d{1,2}\/\d{4}(\s+\d{1,2}:\d{2}:\d{2})?\)$/g, '').trim();

            // Get full content and update info from detail page if link exists
            let content = summary;
            let nextUpdateAt: Date | undefined = undefined;
            let detailPublishedDate = publishedDate;

            if (sourceUrl && sourceUrl.startsWith('http')) {
                // Fetch detail page to get "Tin phát lúc" and "Tin phát tiếp theo lúc"
                try {
                    const detailData = await this.scrapeDetailPage(sourceUrl);
                    if (detailData) {
                        content = detailData.content || summary;
                        if (detailData.publishedDate) {
                            detailPublishedDate = detailData.publishedDate;
                        }
                        nextUpdateAt = detailData.nextUpdateAt;
                    }
                } catch (error) {
                    this.logger.warn(`Failed to scrape detail page ${sourceUrl}: ${error.message}`);
                }
            }

            return {
                type,
                title: cleanTitle,
                summary: summary ? this.cleanText(summary) : undefined,
                content: content ? this.cleanText(content) : undefined,
                imageUrl: imageUrl || undefined,
                sourceUrl: sourceUrl || undefined,
                publishedDate: detailPublishedDate,
                nextUpdateAt,
                location: location || undefined,
                severity: severity || undefined,
            };

        } catch (error) {
            this.logger.error(`Error parsing news item: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract location and severity from title
     */
    private extractLocationAndSeverity(title: string): { location?: string; severity?: string } {
        const result: { location?: string; severity?: string } = {};

        // Common locations
        const locationPatterns = [
            /Biển Đông/gi,
            /Đắk Lắk/gi,
            /Gia Lai/gi,
            /Hà Nội/gi,
            /TP\.?\s*Hồ Chí Minh/gi,
            /Đà Nẵng/gi,
            /sông (\w+)/gi,
            /quận (\w+)/gi,
            /tỉnh (\w+)/gi,
        ];

        for (const pattern of locationPatterns) {
            const match = title.match(pattern);
            if (match) {
                result.location = match[0];
                break;
            }
        }

        // Extract severity indicators
        const severityPatterns = [
            /BÃO SỐ (\d+)/gi,
            /CƠN BÃO SỐ (\d+)/gi,
            /Bão số (\d+)/gi,
            /Cơn bão số (\d+)/gi,
            /CẢNH BÁO/gi,
            /Cảnh báo/gi,
            /Lũ/gi,
            /Dự báo/gi,
        ];

        for (const pattern of severityPatterns) {
            const match = title.match(pattern);
            if (match) {
                result.severity = match[0];
                break;
            }
        }

        return result;
    }

    /**
     * Parse date from title (format: "...(26/11/2025 17:01:00)" or "...(26/11/2025)")
     */
    private parseDateFromTitle(title: string): Date | undefined {
        if (!title) return undefined;

        try {
            // Pattern: (...)(DD/MM/YYYY HH:mm:ss) or (...)(DD/MM/YYYY)
            const dateTimeMatch = title.match(/\((\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\)/);
            if (dateTimeMatch) {
                const [, day, month, year, hour, minute, second] = dateTimeMatch;
                return new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day),
                    parseInt(hour),
                    parseInt(minute),
                    parseInt(second),
                );
            }

            // Pattern: (...)(DD/MM/YYYY)
            const dateMatch = title.match(/\((\d{1,2})\/(\d{1,2})\/(\d{4})\)/);
            if (dateMatch) {
                const [, day, month, year] = dateMatch;
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
        } catch (error) {
            this.logger.warn(`Could not parse date from title: ${title}`);
        }

        return undefined;
    }

    /**
     * Parse date string to Date object
     */
    private parseDate(dateText: string): Date | undefined {
        if (!dateText) return undefined;

        try {
            // Common Vietnamese date formats
            // "Ngày 26/11/2025 lúc 17:01"
            // "26/11/2025"
            // "2025-11-26"

            // Pattern with time: "26/11/2025 17:01:00" or "Ngày 26/11/2025 lúc 17:01"
            const dateTimeMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
            if (dateTimeMatch) {
                const [, day, month, year, hour, minute, second = '0'] = dateTimeMatch;
                return new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day),
                    parseInt(hour),
                    parseInt(minute),
                    parseInt(second),
                );
            }

            // Pattern: "26/11/2025"
            const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (dateMatch) {
                const [, day, month, year] = dateMatch;
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }

            const isoMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
                return new Date(isoMatch[0]);
            }

            // Try parsing as-is
            const parsed = new Date(dateText);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }

        } catch (error) {
            this.logger.warn(`Could not parse date: ${dateText}`);
        }

        return undefined;
    }

    /**
     * Clean and normalize text
     */
    private cleanText(text: string): string {
        return text
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, ' ')
            .trim();
    }

    /**
     * Scrape detail page to get "Tin phát lúc" and "Tin phát tiếp theo lúc"
     */
    private async scrapeDetailPage(url: string): Promise<{
        content?: string;
        publishedDate?: Date;
        nextUpdateAt?: Date;
    } | null> {
        try {
            const response = await axios.get(url, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                },
            });

            const $ = cheerio.load(response.data);
            const result: {
                content?: string;
                publishedDate?: Date;
                nextUpdateAt?: Date;
            } = {};

            // Extract content (full article text)
            const contentSelectors = [
                '.article-content',
                '.post-content',
                '.entry-content',
                'article .content',
                '.news-detail',
                '#content',
            ];

            for (const selector of contentSelectors) {
                const contentElement = $(selector).first();
                if (contentElement.length > 0) {
                    result.content = this.cleanText(contentElement.text());
                    break;
                }
            }

            // Parse "Tin phát lúc" and "Tin phát tiếp theo lúc"
            // Pattern: "Tin phát lúc: 20h00 ngày 26/11" or "Tin phát lúc: 20:00 ngày 26/11/2025"
            // Pattern: "Tin phát tiếp theo lúc: 23h00 ngày 26/11" or "Tin phát tiếp theo lúc: 23:00 ngày 26/11/2025"
            const pageText = $('body').text();

            // Parse "Tin phát lúc"
            const publishedMatch = pageText.match(/Tin phát lúc[:\s]+(\d{1,2})[h:]\s*(\d{0,2})\s*(?:ngày\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/i);
            if (publishedMatch) {
                const [, hour, minute = '00', day, month, year] = publishedMatch;
                const currentYear = year || new Date().getFullYear().toString();
                result.publishedDate = new Date(
                    parseInt(currentYear),
                    parseInt(month) - 1,
                    parseInt(day),
                    parseInt(hour),
                    parseInt(minute),
                    0,
                );
            }

            // Parse "Tin phát tiếp theo lúc"
            const nextUpdateMatch = pageText.match(/Tin phát tiếp theo lúc[:\s]+(\d{1,2})[h:]\s*(\d{0,2})\s*(?:ngày\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/i);
            if (nextUpdateMatch) {
                const [, hour, minute = '00', day, month, year] = nextUpdateMatch;
                const currentYear = year || new Date().getFullYear().toString();
                result.nextUpdateAt = new Date(
                    parseInt(currentYear),
                    parseInt(month) - 1,
                    parseInt(day),
                    parseInt(hour),
                    parseInt(minute),
                    0,
                );
            }

            return result;
        } catch (error) {
            this.logger.error(`Error scraping detail page ${url}: ${error.message}`);
            return null;
        }
    }

    /**
     * Helper method to add delay between requests
     */
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

