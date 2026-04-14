import { Controller, Post, Delete, Get, Body, Req, UseGuards, HttpCode } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { IsString, IsObject, IsOptional, IsNumber } from 'class-validator';

class SubscribeDto {
    @IsString() endpoint: string;
    @IsObject() keys: { p256dh: string; auth: string };
    @IsOptional() @IsNumber() lat?: number;
    @IsOptional() @IsNumber() lng?: number;
}

class UnsubscribeDto {
    @IsString() endpoint: string;
}

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get('vapid-public-key')
    getVapidKey() {
        return this.notificationsService.getVapidPublicKey();
    }

    @Post('subscribe')
    @UseGuards(AuthGuard)
    @HttpCode(201)
    subscribe(@Body() dto: SubscribeDto, @Req() req: { user: { userId: string } }) {
        return this.notificationsService.subscribe(
            req.user.userId,
            { endpoint: dto.endpoint, keys: dto.keys },
            dto.lat && dto.lng ? { lat: dto.lat, lng: dto.lng } : undefined,
        );
    }

    @Delete('unsubscribe')
    @UseGuards(AuthGuard)
    @HttpCode(204)
    unsubscribe(@Body() dto: UnsubscribeDto, @Req() req: { user: { userId: string } }) {
        return this.notificationsService.unsubscribe(req.user.userId, dto.endpoint);
    }
}
