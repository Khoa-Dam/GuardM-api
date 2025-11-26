import { WeatherNewsType } from '../entities/weather-news.entity';

export class WeatherNewsResponseDto {
    id: string;
    type: WeatherNewsType;
    title: string;
    summary?: string;
    content?: string;
    imageUrl?: string;
    sourceUrl?: string;
    publishedDate?: Date;
    location?: string;
    severity?: string;
    createdAt: Date;
    updatedAt: Date;
}

