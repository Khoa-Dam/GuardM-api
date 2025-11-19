import { Controller, Get, Post, Body, Param, Req, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CrimeReportsService } from './crime-reports.service';
import { CreateCrimeReportDto } from './dtos/create-crime-report.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('crime-reports')
@Controller('crime-reports')
export class CrimeReportsController {
    constructor(private readonly crimeReportsService: CrimeReportsService) { }

    @UseGuards(AuthGuard)
    @Post()
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new crime report' })
    @ApiBody({ type: CreateCrimeReportDto })
    @ApiResponse({ status: 201, description: 'Crime report successfully created' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(@Body() createDto: CreateCrimeReportDto, @Req() req) {
        return this.crimeReportsService.create(req.user.userId, createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all crime reports' })
    @ApiResponse({ status: 200, description: 'Returns all crime reports' })
    async findAll() {
        return this.crimeReportsService.findAll();
    }

    @Get('heatmap')
    @ApiOperation({ summary: 'Get heatmap data for crime reports' })
    @ApiResponse({ status: 200, description: 'Returns heatmap data' })
    async getHeatmap() {
        return this.crimeReportsService.getHeatmapData();
    }

    @Get('statistics')
    @ApiOperation({ summary: 'Get crime statistics' })
    @ApiResponse({ status: 200, description: 'Returns crime statistics' })
    async getStatistics() {
        return this.crimeReportsService.getStatistics();
    }

    @Get('district/:district')
    @ApiOperation({ summary: 'Get crime reports by district' })
    @ApiParam({ name: 'district', description: 'District name' })
    @ApiResponse({ status: 200, description: 'Returns crime reports for the district' })
    async findByDistrict(@Param('district') district: string) {
        return this.crimeReportsService.findByDistrict(district);
    }

    @Get('city/:province')
    @ApiOperation({ summary: 'Get crime reports by city/province' })
    @ApiParam({ name: 'province', description: 'Province/City name' })
    @ApiResponse({ status: 200, description: 'Returns crime reports for the city/province' })
    async findByCity(@Param('province') province: string) {
        return this.crimeReportsService.findByCity(province);
    }

    @Get('nearby')
    @ApiOperation({ summary: 'Get nearby crime alerts' })
    @ApiQuery({ name: 'lat', description: 'Latitude', required: true })
    @ApiQuery({ name: 'lng', description: 'Longitude', required: true })
    @ApiQuery({ name: 'radius', description: 'Radius in kilometers', required: false })
    @ApiResponse({ status: 200, description: 'Returns nearby crime alerts' })
    async getNearbyAlerts(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('radius') radius: string,
    ) {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const radiusKm = radius ? parseFloat(radius) : 5;

        if (isNaN(latitude) || isNaN(longitude)) {
            throw new Error('Invalid latitude or longitude');
        }

        return this.crimeReportsService.getNearbyAlert(latitude, longitude, radiusKm);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get crime report by ID' })
    @ApiParam({ name: 'id', description: 'Crime report ID' })
    @ApiResponse({ status: 200, description: 'Returns the crime report' })
    @ApiResponse({ status: 404, description: 'Crime report not found' })
    async findOne(@Param('id') id: string) {
        return this.crimeReportsService.findOne(id);
    }
}
