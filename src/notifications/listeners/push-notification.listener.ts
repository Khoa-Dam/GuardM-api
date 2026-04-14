import { Injectable, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications.service';
import { AiService } from '../../ai/ai.service';
import { ReportCreatedEvent } from '../../crime-reports/events/crime-report.events';

@Injectable()
export class PushNotificationListener {
    private readonly logger = new Logger(PushNotificationListener.name);

    constructor(
        private readonly notificationsService: NotificationsService,
        @Optional() private readonly aiService: AiService,
    ) {}

    @OnEvent('report.created', { async: true })
    async handleCreated(event: ReportCreatedEvent): Promise<void> {
        try {
            const alertText = this.aiService
                ? await this.aiService.generateAlertText(event.report)
                : `Báo cáo mới: ${event.report.title ?? event.report.type}`;
            await this.notificationsService.notifyNearbyUsers(event.report, alertText);
        } catch (err) {
            this.logger.error('Push notification error', err);
        }
    }
}
