import { CrimeReport } from '../entities/crime-report.entity';

export interface CrimeReportResponse {
    id: string;
    reporterId: string;
    title: string;
    description: string;
    type: string;
    lat: number;
    lng: number;
    address: string;
    areaCode?: string;
    province: string;
    district: string;
    ward?: string;
    street?: string;
    source: string;
    attachments?: string[];
    status: number;
    severity: number;
    severityLevel: 'low' | 'medium' | 'high';
    trustScore: number;
    verificationLevel: string;
    confirmationCount: number;
    disputeCount: number;
    reportedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export function mapToCrimeReportResponse(report: CrimeReport): CrimeReportResponse {
    let severityLevel: 'low' | 'medium' | 'high' = 'low';

    if (report.severity >= 5) severityLevel = 'high';
    else if (report.severity >= 3) severityLevel = 'medium';

    return {
        id: report.id,
        reporterId: report.reporterId,
        title: report.title,
        description: report.description,
        type: report.type,
        lat: report.lat,
        lng: report.lng,
        address: report.address,
        areaCode: report.areaCode,
        province: report.province,
        district: report.district,
        ward: report.ward,
        street: report.street,
        source: report.source,
        attachments: report.attachments,
        status: report.status,
        severity: report.severity,
        severityLevel,
        trustScore: report.trustScore || 0,
        verificationLevel: report.verificationLevel || 'unverified',
        confirmationCount: report.confirmationCount || 0,
        disputeCount: report.disputeCount || 0,
        reportedAt: report.reportedAt,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
    };
}


