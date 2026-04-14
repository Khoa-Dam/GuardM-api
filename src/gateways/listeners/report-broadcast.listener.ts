import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CrimeReportsGateway } from '../crime-reports.gateway';
import {
    ReportCreatedEvent,
    ReportUpdatedEvent,
    ReportDeletedEvent,
} from '../../crime-reports/events/crime-report.events';

@Injectable()
export class ReportBroadcastListener {
    constructor(private readonly gateway: CrimeReportsGateway) {}

    @OnEvent('report.created')
    handleCreated(event: ReportCreatedEvent): void {
        this.gateway.broadcastReportCreated(event.report);
    }

    @OnEvent('report.updated')
    handleUpdated(event: ReportUpdatedEvent): void {
        this.gateway.broadcastReportUpdated(event.report);
    }

    @OnEvent('report.deleted')
    handleDeleted(event: ReportDeletedEvent): void {
        this.gateway.broadcastReportDeleted(event.reportId);
    }
}
