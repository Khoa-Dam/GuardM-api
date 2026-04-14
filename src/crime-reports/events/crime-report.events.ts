import { CrimeReportResponse } from '../dtos/crime-report-response.dto';

export class ReportCreatedEvent {
    constructor(public readonly report: CrimeReportResponse) {}
}

export class ReportUpdatedEvent {
    constructor(public readonly report: CrimeReportResponse) {}
}

export class ReportDeletedEvent {
    constructor(public readonly reportId: string) {}
}
