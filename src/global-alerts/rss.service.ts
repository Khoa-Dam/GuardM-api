import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Parser from 'rss-parser';
import { GlobalAlert } from './entities/global-alert.entity';

// Known Vietnamese province/city geocodes
const VN_GEOCODES: Record<string, { lat: number; lng: number }> = {
    'hà nội': { lat: 21.0285, lng: 105.8542 },
    'hcm': { lat: 10.7769, lng: 106.7009 },
    'hồ chí minh': { lat: 10.7769, lng: 106.7009 },
    'sài gòn': { lat: 10.7769, lng: 106.7009 },
    'đà nẵng': { lat: 16.0544, lng: 108.2022 },
    'cần thơ': { lat: 10.0452, lng: 105.7469 },
    'hải phòng': { lat: 20.8449, lng: 106.6881 },
    'huế': { lat: 16.4674, lng: 107.5905 },
    'nha trang': { lat: 12.2388, lng: 109.1967 },
    'vũng tàu': { lat: 10.4114, lng: 107.1362 },
    'đồng nai': { lat: 11.0686, lng: 107.1676 },
    'bình dương': { lat: 11.1605, lng: 106.6741 },
    'long an': { lat: 10.5354, lng: 106.4114 },
    'tiền giang': { lat: 10.3600, lng: 106.3591 },
    'bến tre': { lat: 10.2434, lng: 106.3756 },
    'vĩnh long': { lat: 10.2397, lng: 105.9722 },
    'đồng tháp': { lat: 10.4934, lng: 105.6882 },
    'an giang': { lat: 10.5216, lng: 105.1259 },
    'kiên giang': { lat: 10.0125, lng: 105.0809 },
    'bạc liêu': { lat: 9.2941, lng: 105.7278 },
    'cà mau': { lat: 9.1767, lng: 105.1524 },
    'sóc trăng': { lat: 9.6025, lng: 105.9739 },
    'trà vinh': { lat: 9.9477, lng: 106.3430 },
    'quảng nam': { lat: 15.5394, lng: 108.0191 },
    'quảng ngãi': { lat: 15.1214, lng: 108.7922 },
    'bình định': { lat: 13.7765, lng: 109.2236 },
    'phú yên': { lat: 13.0882, lng: 109.0929 },
    'khánh hòa': { lat: 12.2388, lng: 109.1967 },
    'ninh thuận': { lat: 11.5644, lng: 108.9888 },
    'bình thuận': { lat: 11.0904, lng: 108.0721 },
    'gia lai': { lat: 13.9833, lng: 108.0000 },
    'kon tum': { lat: 14.3497, lng: 108.0005 },
    'đắk lắk': { lat: 12.7100, lng: 108.2378 },
    'đắk nông': { lat: 12.0046, lng: 107.6970 },
    'lâm đồng': { lat: 11.9404, lng: 108.4583 },
    'thanh hóa': { lat: 19.8079, lng: 105.7777 },
    'nghệ an': { lat: 18.6696, lng: 105.6813 },
    'hà tĩnh': { lat: 18.3559, lng: 105.8877 },
    'quảng bình': { lat: 17.4689, lng: 106.5978 },
    'quảng trị': { lat: 16.7403, lng: 107.1857 },
    'thừa thiên huế': { lat: 16.4674, lng: 107.5905 },
    'hải dương': { lat: 20.9399, lng: 106.3309 },
    'hưng yên': { lat: 20.6464, lng: 106.0511 },
    'thái bình': { lat: 20.4499, lng: 106.3370 },
    'nam định': { lat: 20.4388, lng: 106.1621 },
    'ninh bình': { lat: 20.2505, lng: 105.9744 },
    'hà nam': { lat: 20.5835, lng: 105.9230 },
    'vĩnh phúc': { lat: 21.3609, lng: 105.5474 },
    'bắc ninh': { lat: 21.1861, lng: 106.0763 },
    'bắc giang': { lat: 21.2820, lng: 106.1975 },
    'quảng ninh': { lat: 21.0064, lng: 107.2925 },
    'lạng sơn': { lat: 21.8537, lng: 106.7614 },
    'cao bằng': { lat: 22.6666, lng: 106.2638 },
    'bắc kạn': { lat: 22.1445, lng: 105.8348 },
    'thái nguyên': { lat: 21.5944, lng: 105.8412 },
    'tuyên quang': { lat: 21.8236, lng: 105.2148 },
    'hà giang': { lat: 22.8026, lng: 104.9784 },
    'lào cai': { lat: 22.4809, lng: 103.9756 },
    'yên bái': { lat: 21.7051, lng: 104.8700 },
    'phú thọ': { lat: 21.4179, lng: 105.2284 },
    'sơn la': { lat: 21.3256, lng: 103.9188 },
    'điện biên': { lat: 21.3857, lng: 103.0230 },
    'lai châu': { lat: 22.3964, lng: 103.4581 },
    'hòa bình': { lat: 20.8130, lng: 105.3383 },
    'bình phước': { lat: 11.7512, lng: 106.7235 },
    'tây ninh': { lat: 11.3351, lng: 106.1099 },
    'bà rịa': { lat: 10.4939, lng: 107.1333 },
    // Global cities & countries
    'ukraine': { lat: 48.3794, lng: 31.1656 },
    'kyiv': { lat: 50.4501, lng: 30.5234 },
    'russia': { lat: 55.7558, lng: 37.6173 },
    'moscow': { lat: 55.7558, lng: 37.6173 },
    'china': { lat: 39.9042, lng: 116.4074 },
    'beijing': { lat: 39.9042, lng: 116.4074 },
    'shanghai': { lat: 31.2304, lng: 121.4737 },
    'usa': { lat: 38.9072, lng: -77.0369 },
    'washington': { lat: 38.9072, lng: -77.0369 },
    'new york': { lat: 40.7128, lng: -74.0060 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    'london': { lat: 51.5074, lng: -0.1278 },
    'paris': { lat: 48.8566, lng: 2.3522 },
    'berlin': { lat: 52.5200, lng: 13.4050 },
    'germany': { lat: 52.5200, lng: 13.4050 },
    'france': { lat: 48.8566, lng: 2.3522 },
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'japan': { lat: 35.6762, lng: 139.6503 },
    'seoul': { lat: 37.5665, lng: 126.9780 },
    'south korea': { lat: 37.5665, lng: 126.9780 },
    'north korea': { lat: 40.3399, lng: 127.5101 },
    'bangkok': { lat: 13.7563, lng: 100.5018 },
    'thailand': { lat: 13.7563, lng: 100.5018 },
    'singapore': { lat: 1.3521, lng: 103.8198 },
    'jakarta': { lat: -6.2088, lng: 106.8456 },
    'indonesia': { lat: -6.2088, lng: 106.8456 },
    'manila': { lat: 14.5995, lng: 120.9842 },
    'philippines': { lat: 14.5995, lng: 120.9842 },
    'sydney': { lat: -33.8688, lng: 151.2093 },
    'australia': { lat: -33.8688, lng: 151.2093 },
    'india': { lat: 28.6139, lng: 77.2090 },
    'new delhi': { lat: 28.6139, lng: 77.2090 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'pakistan': { lat: 33.6844, lng: 73.0479 },
    'israel': { lat: 31.7683, lng: 35.2137 },
    'tel aviv': { lat: 32.0853, lng: 34.7818 },
    'gaza': { lat: 31.5017, lng: 34.4668 },
    'iran': { lat: 35.6892, lng: 51.3890 },
    'tehran': { lat: 35.6892, lng: 51.3890 },
    'taiwan': { lat: 25.0320, lng: 121.5654 },
    'myanmar': { lat: 16.8661, lng: 96.1951 },
    'cambodia': { lat: 11.5564, lng: 104.9282 },
    'laos': { lat: 17.9757, lng: 102.6331 },
    'malaysia': { lat: 3.1390, lng: 101.6869 },
    'kuala lumpur': { lat: 3.1390, lng: 101.6869 },
    'brazil': { lat: -15.7801, lng: -47.9292 },
    'mexico': { lat: 19.4326, lng: -99.1332 },
    'canada': { lat: 45.4215, lng: -75.6919 },
    'turkey': { lat: 39.9334, lng: 32.8597 },
    'istanbul': { lat: 41.0082, lng: 28.9784 },
    'egypt': { lat: 30.0444, lng: 31.2357 },
    'cairo': { lat: 30.0444, lng: 31.2357 },
    'nigeria': { lat: 9.0820, lng: 8.6753 },
    'saudi arabia': { lat: 24.6877, lng: 46.7219 },
    'afghanistan': { lat: 34.5553, lng: 69.2075 },
    'kabul': { lat: 34.5553, lng: 69.2075 },
    'syria': { lat: 33.5138, lng: 36.2765 },
    'damascus': { lat: 33.5138, lng: 36.2765 },
    'iraq': { lat: 33.3152, lng: 44.3661 },
    'baghdad': { lat: 33.3152, lng: 44.3661 },
    'lebanon': { lat: 33.8886, lng: 35.4955 },
    'beirut': { lat: 33.8886, lng: 35.4955 },
    'kenya': { lat: -1.2921, lng: 36.8219 },
    'nairobi': { lat: -1.2921, lng: 36.8219 },
    'south africa': { lat: -25.7479, lng: 28.2293 },
    'johannesburg': { lat: -26.2041, lng: 28.0473 },
    'spain': { lat: 40.4168, lng: -3.7038 },
    'madrid': { lat: 40.4168, lng: -3.7038 },
    'italy': { lat: 41.9028, lng: 12.4964 },
    'rome': { lat: 41.9028, lng: 12.4964 },
    'poland': { lat: 52.2297, lng: 21.0122 },
    'warsaw': { lat: 52.2297, lng: 21.0122 },
};

const RSS_SOURCES = [
    // Vietnamese sources
    { url: 'https://vnexpress.net/rss/phap-luat.rss', source: 'rss_vnexpress', category: 'crime' },
    { url: 'https://vnexpress.net/rss/thoi-tiet.rss', source: 'rss_vnexpress', category: 'disaster' },
    { url: 'https://tuoitre.vn/rss/thoi-su.rss', source: 'rss_tuoitre', category: 'general' },
    { url: 'https://dantri.com.vn/su-kien.rss', source: 'rss_dantri', category: 'general' },
    // Global sources
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'rss_bbc', category: 'general' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'rss_aljazeera', category: 'general' },
    { url: 'https://feeds.skynews.com/feeds/rss/world.xml', source: 'rss_skynews', category: 'general' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'rss_nytimes', category: 'general' },
];

@Injectable()
export class RssService {
    private readonly logger = new Logger(RssService.name);
    private readonly parser = new Parser({ timeout: 10000, headers: { 'User-Agent': 'GuardM/1.0' } });

    constructor(
        @InjectRepository(GlobalAlert)
        private readonly repo: Repository<GlobalAlert>,
    ) {}

    async fetch(): Promise<number> {
        let totalSaved = 0;

        await Promise.allSettled(
            RSS_SOURCES.map(async (feed) => {
                try {
                    const result = await this.parser.parseURL(feed.url);
                    for (const item of result.items ?? []) {
                        if (!item.link || !item.title) continue;

                        const coords = this.geocodeFromText(item.title + ' ' + (item.contentSnippet ?? ''));
                        if (!coords) continue;

                        const severity = this.detectSeverity(item.title + ' ' + (item.contentSnippet ?? ''));
                        const category = feed.category !== 'general'
                            ? feed.category
                            : this.detectCategory(item.title);

                        try {
                            await this.repo.upsert(
                                {
                                    externalId: item.link,
                                    source: feed.source,
                                    title: item.title,
                                    url: item.link,
                                    lat: coords.lat,
                                    lng: coords.lng,
                                    locationName: coords.name,
                                    category,
                                    severity,
                                    summary: item.contentSnippet?.slice(0, 300) ?? undefined,
                                    publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                                },
                                ['externalId'],
                            );
                            totalSaved++;
                        } catch {
                            // duplicate — ignore
                        }
                    }
                } catch (err) {
                    this.logger.warn(`RSS fetch error for ${feed.url}: ${err.message}`);
                }
            }),
        );

        return totalSaved;
    }

    private geocodeFromText(text: string): { lat: number; lng: number; name: string } | null {
        const lower = text.toLowerCase();
        for (const [name, coords] of Object.entries(VN_GEOCODES)) {
            if (lower.includes(name)) {
                return { ...coords, name };
            }
        }
        return null;
    }

    private detectSeverity(text: string): string {
        const lower = text.toLowerCase();
        const highKeywords = ['chết', 'tử vong', 'tử', 'cháy', 'lũ lụt', 'lũ', 'bão', 'động đất', 'nổ', 'sập', 'giết', 'bắn', 'hiếp'];
        const medKeywords = ['tai nạn', 'trộm', 'cướp', 'đâm', 'thương tích', 'ngộ độc', 'mưa lớn', 'ngập'];
        if (highKeywords.some(k => lower.includes(k))) return 'high';
        if (medKeywords.some(k => lower.includes(k))) return 'medium';
        return 'low';
    }

    private detectCategory(text: string): string {
        const lower = text.toLowerCase();
        if (['giết', 'bắn', 'cướp', 'trộm', 'hiếp', 'bắt cóc', 'tội phạm'].some(k => lower.includes(k))) return 'crime';
        if (['lũ', 'bão', 'động đất', 'sạt lở', 'hạn hán', 'lốc'].some(k => lower.includes(k))) return 'disaster';
        if (['tai nạn', 'nổ', 'cháy', 'sập'].some(k => lower.includes(k))) return 'accident';
        return 'general';
    }
}
