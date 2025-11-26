import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeatherNews } from './entities/weather-news.entity';
import { WeatherNewsService } from './weather-news.service';
import { WeatherNewsController } from './weather-news.controller';

@Module({
    imports: [TypeOrmModule.forFeature([WeatherNews])],
    providers: [WeatherNewsService],
    controllers: [WeatherNewsController],
    exports: [WeatherNewsService],
})
export class WeatherNewsModule { }

