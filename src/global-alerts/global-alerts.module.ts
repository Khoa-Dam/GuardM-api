import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalAlert } from './entities/global-alert.entity';
import { GdeltService } from './gdelt.service';
import { RssService } from './rss.service';
import { GlobalAlertsCronService } from './global-alerts-cron.service';
import { GlobalAlertsController } from './global-alerts.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([GlobalAlert]), AuthModule],
    providers: [GdeltService, RssService, GlobalAlertsCronService],
    controllers: [GlobalAlertsController],
    exports: [GlobalAlertsCronService],
})
export class GlobalAlertsModule {}
