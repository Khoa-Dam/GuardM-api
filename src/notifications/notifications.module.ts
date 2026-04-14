import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushSubscription } from './entities/push-subscription.entity';
import { AuthModule } from '../auth/auth.module';
import { PushNotificationListener } from './listeners/push-notification.listener';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [TypeOrmModule.forFeature([PushSubscription]), AuthModule, AiModule],
    providers: [NotificationsService, PushNotificationListener],
    controllers: [NotificationsController],
    exports: [NotificationsService],
})
export class NotificationsModule {}
