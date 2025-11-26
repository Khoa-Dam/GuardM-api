import { Controller, Get, Param, Query, Post, Body, Put, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { WeatherNewsService } from './weather-news.service';
import { WeatherNewsType } from './entities/weather-news.entity';
import { CreateWeatherNewsDto } from './dtos/create-weather-news.dto';
import { UpdateWeatherNewsDto } from './dtos/update-weather-news.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@ApiTags('weather-news')
@Controller('weather-news')
export class WeatherNewsController {
    constructor(private readonly weatherNewsService: WeatherNewsService) { }

    @Post()
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.Admin)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create weather news (Admin only)' })
    @ApiResponse({ status: 201, description: 'Weather news created successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async create(@Body() createDto: CreateWeatherNewsDto) {
        return this.weatherNewsService.create(createDto);
    }

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

    @Put(':id')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.Admin)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update weather news (Admin only)' })
    @ApiResponse({ status: 200, description: 'Weather news updated successfully' })
    @ApiResponse({ status: 404, description: 'Weather news not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async update(@Param('id') id: string, @Body() updateDto: UpdateWeatherNewsDto) {
        return this.weatherNewsService.update(id, updateDto);
    }

    @Delete(':id')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.Admin)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete weather news (Admin only)' })
    @ApiResponse({ status: 200, description: 'Weather news deleted successfully' })
    @ApiResponse({ status: 404, description: 'Weather news not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async remove(@Param('id') id: string) {
        return this.weatherNewsService.delete(id);
    }
}

