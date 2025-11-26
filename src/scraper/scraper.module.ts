import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { ScraperCronService } from './scraper-cron.service';
import { WeatherScraperService } from './weather-scraper.service';
import { WeatherScraperCronService } from './weather-scraper-cron.service';
import { AuthModule } from '../auth/auth.module';
import { WantedCriminalsModule } from '../wanted-criminals/wanted-criminals.module';
import { WeatherNewsModule } from '../weather-news/weather-news.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

@Module({
    imports: [
        AuthModule,
        WantedCriminalsModule,
        WeatherNewsModule,
        TypeOrmModule.forFeature([User]),
    ],
    providers: [
        ScraperService,
        ScraperCronService,
        WeatherScraperService,
        WeatherScraperCronService,
    ],
    controllers: [ScraperController],
    exports: [ScraperService, WeatherScraperService],
})
export class ScraperModule { }

