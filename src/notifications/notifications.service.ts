import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from './entities/push-subscription.entity';
import * as webpush from 'web-push';
import { CrimeReportResponse } from '../crime-reports/dtos/crime-report-response.dto';
import { distanceKm } from '../shared/geo.utils';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);
    private readonly ALERT_RADIUS_KM = 5;

    constructor(
        @InjectRepository(PushSubscription)
        private readonly subRepo: Repository<PushSubscription>,
    ) {
        const pub = process.env.WEB_PUSH_PUBLIC_KEY;
        const priv = process.env.WEB_PUSH_PRIVATE_KEY;
        const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:admin@guardm.space';

        if (pub && priv) {
            webpush.setVapidDetails(subject, pub, priv);
            this.logger.log('Web Push VAPID initialized');
        } else {
            this.logger.warn('WEB_PUSH keys not set — push notifications disabled');
        }
    }

    async subscribe(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }, location?: { lat: number; lng: number }) {
        const existing = await this.subRepo.findOne({ where: { endpoint: sub.endpoint } });
        if (existing) {
            await this.subRepo.update(existing.id, { userId, active: true, ...(location ?? {}) });
            return existing;
        }
        const entity = this.subRepo.create({ userId, ...sub, ...(location ?? {}), active: true });
        return this.subRepo.save(entity);
    }

    async unsubscribe(userId: string, endpoint: string) {
        await this.subRepo.update({ userId, endpoint }, { active: false });
    }

    async getVapidPublicKey() {
        return { publicKey: process.env.WEB_PUSH_PUBLIC_KEY ?? null };
    }

    async notifyNearbyUsers(report: CrimeReportResponse, alertText: string) {
        if (!process.env.WEB_PUSH_PUBLIC_KEY) return;

        const subs = await this.subRepo.find({ where: { active: true } });

        const targets = report.lat && report.lng
            ? subs.filter(s => s.lat && s.lng && distanceKm(report.lat, report.lng, s.lat, s.lng) <= this.ALERT_RADIUS_KM)
            : subs;

        const payload = JSON.stringify({
            title: '🚨 GuardM Alert',
            body: alertText,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            tag: `report-${report.id}`,
            data: { reportId: report.id, url: `/map?focus=${report.id}` },
        });

        const results = await Promise.allSettled(
            targets.map(sub =>
                webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
                    .catch(async err => {
                        if (err.statusCode === 410) {
                            // Subscription expired — deactivate
                            await this.subRepo.update(sub.id, { active: false });
                        }
                        throw err;
                    })
            )
        );

        const sent = results.filter(r => r.status === 'fulfilled').length;
        this.logger.log(`Push sent to ${sent}/${targets.length} subscribers for report ${report.id}`);
    }

}
