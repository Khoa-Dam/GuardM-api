import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeatherNews } from './entities/weather-news.entity';
import { WeatherNewsService } from './weather-news.service';
import { WeatherNewsController } from './weather-news.controller';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([WeatherNews, User]),
        AuthModule,
    ],
    providers: [WeatherNewsService],
    controllers: [WeatherNewsController],
    exports: [WeatherNewsService],
})
export class WeatherNewsModule { }

