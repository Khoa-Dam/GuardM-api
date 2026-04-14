import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { GlobalAlert } from './entities/global-alert.entity';

interface GdeltArticle {
    url?: string;
    title?: string;
    seendate?: string;
    domain?: string;
    language?: string;
    sourcecountry?: string;
    V2Locations?: string;
    V2Themes?: string;
}

interface GdeltResponse {
    articles?: GdeltArticle[];
}

@Injectable()
export class GdeltService {
    private readonly logger = new Logger(GdeltService.name);

    constructor(
        @InjectRepository(GlobalAlert)
        private readonly repo: Repository<GlobalAlert>,
    ) {}

    async fetch(): Promise<number> {
        const queries = [
            'crime OR murder OR robbery',
            'disaster OR flood OR earthquake OR typhoon',
            'accident OR explosion OR fire',
        ];

        let totalSaved = 0;

        for (const query of queries) {
            try {
                const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=75&format=json&timespan=6h`;
                const response = await axios.get<GdeltResponse>(url, { timeout: 15000 });
                const articles = response.data?.articles ?? [];

                for (const article of articles) {
                    if (!article.url || !article.title) continue;

                    const coords = this.extractCoords(article.V2Locations ?? '');
                    if (!coords) continue; // skip ungeocoded

                    const { category, severity } = this.classifyThemes(article.V2Themes ?? '');

                    try {
                        await this.repo.upsert(
                            {
                                externalId: article.url,
                                source: 'gdelt',
                                title: article.title,
                                url: article.url,
                                lat: coords.lat,
                                lng: coords.lng,
                                locationName: coords.name,
                                category,
                                severity,
                                summary: undefined,
                                publishedAt: this.parseDate(article.seendate ?? ''),
                            },
                            ['externalId'],
                        );
                        totalSaved++;
                    } catch (e) {
                        // duplicate or constraint error — ignore
                    }
                }
            } catch (err) {
                this.logger.warn(`GDELT fetch error for query "${query}": ${err.message}`);
            }
        }

        return totalSaved;
    }

    private extractCoords(v2Locations: string): { lat: number; lng: number; name: string } | null {
        if (!v2Locations) return null;
        // V2Locations format: TYPE#NAME#COUNTRYCODE#ADM1#LAT#LNG#FEATUREID;...
        const parts = v2Locations.split(';');
        for (const part of parts) {
            const fields = part.split('#');
            if (fields.length >= 6) {
                const lat = parseFloat(fields[4]);
                const lng = parseFloat(fields[5]);
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                    return { lat, lng, name: fields[1] ?? '' };
                }
            }
        }
        return null;
    }

    private classifyThemes(v2Themes: string): { category: string; severity: string } {
        const themes = v2Themes.toUpperCase();
        if (themes.includes('CRIMEVIOLENCE') || themes.includes('MURDER') || themes.includes('ROBBERY')) {
            return { category: 'crime', severity: 'high' };
        }
        if (themes.includes('NATURAL_DISASTER') || themes.includes('FLOOD') || themes.includes('EARTHQUAKE') || themes.includes('TYPHOON')) {
            return { category: 'disaster', severity: 'high' };
        }
        if (themes.includes('ACCIDENT') || themes.includes('FIRE') || themes.includes('EXPLOSION')) {
            return { category: 'accident', severity: 'medium' };
        }
        if (themes.includes('CONFLICT') || themes.includes('WAR') || themes.includes('ATTACK')) {
            return { category: 'conflict', severity: 'high' };
        }
        return { category: 'general', severity: 'low' };
    }

    private parseDate(seendate: string): Date {
        // GDELT format: YYYYMMDDHHMMSS
        if (seendate.length === 14) {
            const y = seendate.slice(0, 4);
            const mo = seendate.slice(4, 6);
            const d = seendate.slice(6, 8);
            const h = seendate.slice(8, 10);
            const mi = seendate.slice(10, 12);
            const s = seendate.slice(12, 14);
            return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
        }
        return new Date();
    }
}
