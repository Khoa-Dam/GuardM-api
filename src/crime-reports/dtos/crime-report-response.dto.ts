import { CrimeReport } from '../../entities/crime-report.entity';

export interface CrimeReportResponse {
    id: string;
    reporterId: string;
    title: string;
    description: string;
    type: string;
    lat: number;
    lng: number;
    address: string;
    province: string;
    district: string;
    ward?: string;
    street?: string;
    status: number;
    severity: number;
    severityLevel: 'low' | 'medium' | 'high';
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
        province: report.province,
        district: report.district,
        ward: report.ward,
        street: report.street,
        status: report.status,
        severity: report.severity,
        severityLevel,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
    };
}


