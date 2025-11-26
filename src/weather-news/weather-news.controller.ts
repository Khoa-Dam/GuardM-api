import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WeatherNewsService } from './weather-news.service';
import { WeatherNewsType } from './entities/weather-news.entity';

@ApiTags('weather-news')
@Controller('weather-news')
export class WeatherNewsController {
    constructor(private readonly weatherNewsService: WeatherNewsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all weather news' })
    @ApiQuery({ name: 'type', enum: WeatherNewsType, required: false, description: 'Filter by news type' })
    @ApiResponse({ status: 200, description: 'Returns all weather news' })
    async findAll(@Query('type') type?: WeatherNewsType) {
        return this.weatherNewsService.findAll(type);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get weather news by ID' })
    @ApiResponse({ status: 200, description: 'Returns the weather news' })
    @ApiResponse({ status: 404, description: 'Weather news not found' })
    async findOne(@Param('id') id: string) {
        return this.weatherNewsService.findOne(id);
    }
}

