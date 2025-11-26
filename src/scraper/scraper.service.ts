import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { WantedCriminal } from '../wanted-criminals/entities/wanted-criminal.entity';

@Injectable()
export class ScraperService {
    private readonly logger = new Logger(ScraperService.name);
    private readonly baseUrl = 'https://truyna.bocongan.gov.vn';

    /**
     * Scrape all wanted criminals from Bộ Công An website
     */
    async scrapeWantedCriminals(maxPages: number = 10, limit?: number): Promise<Partial<WantedCriminal>[]> {
        const criminals: Partial<WantedCriminal>[] = [];
        // If limit is provided, we might need more pages than maxPages default.
        // Let's set a high maxPages if limit is present, or just loop until limit.
        const effectiveMaxPages = limit ? 1000 : maxPages;

        try {
            // Scrape main listing pages
            for (let page = 1; page <= effectiveMaxPages; page++) {
                this.logger.log(`Scraping page ${page}...`);

                const pageCriminals = await this.scrapePage(page);
                if (pageCriminals.length === 0) {
                    this.logger.warn(`No criminals found on page ${page}, stopping...`);
                    break;
                }

                criminals.push(...pageCriminals);

                // Check if we reached the limit
                if (limit && criminals.length >= limit) {
                    // Slice to exact limit
                    const limitedCriminals = criminals.slice(0, limit);
                    this.logger.log(`Reached limit of ${limit} criminals, stopping.`);
                    return limitedCriminals;
                }

                // Add delay to be respectful
                await this.delay(1000);
            }

            this.logger.log(`Total scraped: ${criminals.length} criminals`);
            return criminals;

        } catch (error) {
            this.logger.error(`Error scraping wanted criminals: ${error.message}`);
            throw error;
        }
    }

    /**
     * Scrape a single page of wanted criminals
     */
    private async scrapePage(page: number): Promise<Partial<WantedCriminal>[]> {
        try {
            // Get the main page first to see the pagination structure
            const url = page === 1
                ? `${this.baseUrl}/Trang-chủ`
                : `${this.baseUrl}/Trang-chủ/ctl/chitiet/mid/1091?page=${page}`;

            const response = await axios.get(url, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                },
            });

            const $ = cheerio.load(response.data);
            const criminals: Partial<WantedCriminal>[] = [];

            // Find the table with wanted criminals data
            // Based on the web content, the data is in a table with specific structure
            $('table tbody tr').each((index, element) => {
                if (index === 0) return; // Skip header row

                const $row = $(element);
                const cells = $row.find('td');

                if (cells.length < 7) return;

                try {
                    const criminal = this.parseTableRow($, cells);
                    if (criminal) {
                        criminals.push(criminal);
                    }
                } catch (error) {
                    this.logger.warn(`Error parsing row ${index}: ${error.message}`);
                }
            });

            return criminals;

        } catch (error) {
            this.logger.error(`Error scraping page ${page}: ${error.message}`);
            return [];
        }
    }

    /**
     * Parse a table row into a WantedCriminal object
     */
    private parseTableRow($: cheerio.CheerioAPI, cells: cheerio.Cheerio<any>): Partial<WantedCriminal> | null {
        try {
            // Extract data from table cells based on the structure:
            // STT | Họ tên | Năm sinh | Nơi ĐKTT | Họ tên bố/mẹ | Tội danh | Số QĐ | Đơn vị ra QĐ

            const nameLink = $(cells[1]).find('a');
            const fullName = nameLink.text().trim() || $(cells[1]).text().trim();

            if (!fullName) return null;

            const birthYearStr = $(cells[2]).text().trim();
            const birthYear = birthYearStr ? parseInt(birthYearStr) : null;

            const address = $(cells[3]).text().trim();
            const parents = $(cells[4]).text().trim();
            const crime = $(cells[5]).text().trim();
            const decisionNumber = $(cells[6]).text().trim();
            const issuingUnit = $(cells[7]).text().trim();

            return {
                name: fullName,
                birthYear: birthYear || undefined,
                address: address || undefined,
                parents: parents || undefined,
                crime,
                decisionNumber: decisionNumber || undefined,
                issuingUnit: issuingUnit || undefined,
            };

        } catch (error) {
            this.logger.error(`Error parsing table row: ${error.message}`);
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

