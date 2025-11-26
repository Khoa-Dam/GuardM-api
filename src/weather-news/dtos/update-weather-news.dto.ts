import { PartialType } from '@nestjs/swagger';
import { CreateWeatherNewsDto } from './create-weather-news.dto';

export class UpdateWeatherNewsDto extends PartialType(CreateWeatherNewsDto) {}
