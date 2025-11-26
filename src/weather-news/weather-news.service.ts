import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeatherNews, WeatherNewsType } from './entities/weather-news.entity';

@Injectable()
export class WeatherNewsService {
    private readonly logger = new Logger(WeatherNewsService.name);

    constructor(
        @InjectRepository(WeatherNews)
        private weatherNewsRepository: Repository<WeatherNews>,
    ) { }

    async findAll(type?: WeatherNewsType): Promise<WeatherNews[]> {
        const where = type ? { type } : {};
        return this.weatherNewsRepository.find({
            where,
            order: { publishedDate: 'DESC', createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<WeatherNews> {
        const news = await this.weatherNewsRepository.findOne({ where: { id } });
        if (!news) {
            throw new Error('Weather news not found');
        }
        return news;
    }

    async create(newsData: Partial<WeatherNews>): Promise<WeatherNews> {
        const news = this.weatherNewsRepository.create(newsData);
        return this.weatherNewsRepository.save(news);
    }

    async createOrUpdate(newsData: Partial<WeatherNews>): Promise<WeatherNews> {
        // Check if exists by sourceUrl + type (same URL can appear in both tabs with different types)
        if (newsData.sourceUrl && newsData.type) {
            const existing = await this.weatherNewsRepository.findOne({
                where: {
                    sourceUrl: newsData.sourceUrl,
                    type: newsData.type,
                },
            });

            if (existing) {
                // Update existing with same sourceUrl and type
                Object.assign(existing, newsData);
                return this.weatherNewsRepository.save(existing);
            }
        }

        // Create new (either no sourceUrl/type, or new combination)
        return this.create(newsData);
    }

    async delete(id: string): Promise<void> {
        await this.weatherNewsRepository.delete(id);
    }

    /**
     * Normalize title by removing date part at the end
     */
    normalizeTitle(title: string): string {
        if (!title) return '';
        // Remove date part like "(26/11/2025 17:01:00)" or "(26/11/2025)" at the end
        return title.replace(/\(\d{1,2}\/\d{1,2}\/\d{4}(\s+\d{1,2}:\d{2}:\d{2})?\)$/g, '').trim();
    }

    /**
     * Find and delete old duplicate news with same normalized title but different sourceUrl
     */
    async deleteOldDuplicates(newNews: Partial<WeatherNews>): Promise<number> {
        if (!newNews.title || !newNews.type || !newNews.sourceUrl) {
            return 0;
        }

        const normalizedTitle = this.normalizeTitle(newNews.title);
        const allNews = await this.findAll(newNews.type);

        // Find news with same normalized title and type but different sourceUrl
        const duplicates = allNews.filter(n => {
            const nNormalized = this.normalizeTitle(n.title);
            return nNormalized === normalizedTitle &&
                n.sourceUrl !== newNews.sourceUrl &&
                n.type === newNews.type;
        });

        // Delete old duplicates (keep the new one)
        let deletedCount = 0;
        for (const duplicate of duplicates) {
            await this.delete(duplicate.id);
            deletedCount++;
        }

        return deletedCount;
    }
}

