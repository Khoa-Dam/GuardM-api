import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { CRIME_TYPE_LABEL } from '../shared/crime-types.constants';

export interface AreaAnalysis {
    safetyScore: number;   // 0-100
    level: 'safe' | 'moderate' | 'dangerous';
    summary: string;
    trends: string[];
    recommendation: string;
    reportCount: number;
}

export interface ParsedReport {
    title: string;
    type: string;
    severity: number;
    description: string;
}

const MODEL = 'gemini-2.0-flash';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private client: GoogleGenAI | null = null;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.client = new GoogleGenAI({ apiKey });
            this.logger.log('Gemini client initialized');
        } else {
            this.logger.warn('GEMINI_API_KEY not set — AI features disabled');
        }
    }

    private get isAvailable() { return !!this.client; }

    private extractJson(raw: string): string {
        return raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    }

    // ── Area safety analysis ─────────────────────────────────────────────────
    async analyzeArea(reports: Array<{
        type: string;
        severity: number;
        address?: string;
        createdAt: Date;
    }>): Promise<AreaAnalysis> {
        const reportCount = reports.length;

        if (!this.isAvailable || reportCount === 0) {
            const score = Math.max(0, 100 - reportCount * 8);
            return {
                safetyScore: score,
                level: score >= 70 ? 'safe' : score >= 40 ? 'moderate' : 'dangerous',
                summary: reportCount === 0
                    ? 'Không có báo cáo sự cố nào trong khu vực này.'
                    : `Có ${reportCount} báo cáo trong khu vực.`,
                trends: [],
                recommendation: 'Hãy cẩn thận và báo cáo nếu phát hiện sự cố.',
                reportCount,
            };
        }

        const recentReports = reports.slice(0, 20);
        const reportSummary = recentReports.map(r =>
            `- Loại: ${r.type}, Mức độ: ${r.severity}/5, Địa chỉ: ${r.address || 'N/A'}, Thời gian: ${new Date(r.createdAt).toLocaleDateString('vi-VN')}`
        ).join('\n');

        try {
            const response = await this.client!.models.generateContent({
                model: MODEL,
                contents: `Bạn là hệ thống phân tích an toàn đô thị của GuardM tại Việt Nam.
Dưới đây là ${reportCount} báo cáo tội phạm/sự cố trong khu vực:

${reportSummary}

Hãy phân tích và trả lời theo format JSON sau (không có markdown, chỉ JSON thuần):
{
  "safetyScore": <số 0-100, 100 là an toàn nhất>,
  "level": <"safe"|"moderate"|"dangerous">,
  "summary": <tóm tắt 1-2 câu bằng tiếng Việt>,
  "trends": [<3 xu hướng ngắn bằng tiếng Việt>],
  "recommendation": <1 khuyến nghị cụ thể bằng tiếng Việt>
}`,
            });

            const parsed = JSON.parse(this.extractJson(response.text ?? '{}'));
            return { ...parsed, reportCount };
        } catch (err) {
            this.logger.error('AI analyze error', err);
            const score = Math.max(0, 100 - reportCount * 8);
            return {
                safetyScore: score,
                level: score >= 70 ? 'safe' : score >= 40 ? 'moderate' : 'dangerous',
                summary: `Phát hiện ${reportCount} sự cố trong khu vực.`,
                trends: ['Dữ liệu đang được cập nhật'],
                recommendation: 'Hãy cẩn thận khi di chuyển trong khu vực này.',
                reportCount,
            };
        }
    }

    // ── Parse free-text report ───────────────────────────────────────────────
    async parseReport(text: string): Promise<ParsedReport> {
        if (!this.isAvailable) {
            return {
                title: text.slice(0, 60),
                type: 'dang_ngo',
                severity: 2,
                description: text,
            };
        }

        const crimeTypes = ['giet_nguoi', 'bat_coc', 'truy_na', 'cuop_giat', 'de_doa', 'nghi_pham', 'dang_ngo', 'trom_cap'];

        try {
            const response = await this.client!.models.generateContent({
                model: MODEL,
                contents: `Bạn là hệ thống phân tích báo cáo tội phạm GuardM tại Việt Nam.
Người dùng mô tả: "${text}"

Phân loại và cấu trúc hóa thành JSON (không markdown, chỉ JSON):
{
  "title": <tiêu đề ngắn gọn dưới 60 ký tự>,
  "type": <một trong: ${crimeTypes.join(', ')}>,
  "severity": <1-5, trong đó 5=cực kỳ nguy hiểm>,
  "description": <mô tả lại rõ ràng, súc tích bằng tiếng Việt>
}`,
            });

            return JSON.parse(this.extractJson(response.text ?? '{}'));
        } catch (err) {
            this.logger.error('AI parse-report error', err);
            return {
                title: text.slice(0, 60),
                type: 'dang_ngo',
                severity: 2,
                description: text,
            };
        }
    }

    // ── Generate push notification text ─────────────────────────────────────
    async generateAlertText(report: { type: string; address?: string; severity: number }): Promise<string> {
        const label = CRIME_TYPE_LABEL[report.type as keyof typeof CRIME_TYPE_LABEL] ?? 'Sự cố';
        return `⚠️ ${label} vừa được báo cáo ${report.address ? `tại ${report.address}` : 'gần bạn'}`;
    }
}
