import {
    Controller, Get, Post, Body, Param, Req, UseGuards, Query,
    UploadedFiles, BadRequestException, Put, Delete, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CrimeType } from '../enums/crime-type.enum';
import {
    ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
    ApiBody, ApiQuery, ApiParam, ApiConsumes,
} from '@nestjs/swagger';
import { CrimeReportsService } from './crime-reports.service';
import { CommunityVotingService } from './community-voting.service';
import { CreateCrimeReportDto } from './dtos/create-crime-report.dto';
import { UpdateCrimeReportDto } from './dtos/update-crime-report.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@ApiTags('crime-reports')
@Controller('crime-reports')
export class CrimeReportsController {
    constructor(
        private readonly crimeReportsService: CrimeReportsService,
        private readonly communityVotingService: CommunityVotingService,
    ) {}

    @UseGuards(AuthGuard)
    @Post()
    @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 100 * 1024 * 1024 } }))
    @ApiBearerAuth('JWT-auth')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a new crime report' })
    @ApiBody({ type: CreateCrimeReportDto })
    @ApiResponse({ status: 201, description: 'Crime report successfully created' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() createReportDto: CreateCrimeReportDto,
        @Req() req: any,
    ) {
        const reporterId = req.user?.userId;
        if (!reporterId) throw new BadRequestException('User identification failed');

        const attachmentUrls = await this.crimeReportsService.processAttachments(
            files,
            Array.isArray(createReportDto.attachments) ? createReportDto.attachments : [],
        );
        createReportDto.attachments = attachmentUrls.length > 0 ? attachmentUrls : undefined;

        return this.crimeReportsService.create(reporterId, createReportDto);
    }

    @UseGuards(AuthGuard)
    @Put(':id')
    @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 100 * 1024 * 1024 } }))
    @ApiBearerAuth('JWT-auth')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update an existing crime report (owner only)' })
    @ApiBody({ type: UpdateCrimeReportDto })
    @ApiParam({ name: 'id', description: 'Crime report ID' })
    @ApiResponse({ status: 200, description: 'Crime report successfully updated' })
    @ApiResponse({ status: 400, description: 'Bad request or not owner' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Crime report not found' })
    async update(
        @Param('id') id: string,
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() updateReportDto: UpdateCrimeReportDto,
        @Req() req: any,
    ) {
        const reporterId = req.user?.userId;
        if (!reporterId) throw new BadRequestException('User identification failed');

        // Normalize attachments field (may arrive as JSON string from multipart)
        let existingAttachments: string[] = [];
        if (updateReportDto.attachments) {
            if (typeof updateReportDto.attachments === 'string') {
                try { existingAttachments = JSON.parse(updateReportDto.attachments); }
                catch { existingAttachments = [updateReportDto.attachments]; }
            } else if (Array.isArray(updateReportDto.attachments)) {
                existingAttachments = updateReportDto.attachments;
            }
        }

        updateReportDto.attachments = await this.crimeReportsService.processAttachments(
            files,
            existingAttachments,
        );

        return this.crimeReportsService.updateReport(id, reporterId, updateReportDto);
    }

    @UseGuards(AuthGuard)
    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete a crime report (owner only)' })
    @ApiParam({ name: 'id', description: 'Crime report ID' })
    @ApiResponse({ status: 200, description: 'Crime report deleted' })
    @ApiResponse({ status: 400, description: 'Bad request or not owner' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Crime report not found' })
    async remove(@Param('id') id: string, @Req() req: any) {
        const reporterId = req.user?.userId;
        if (!reporterId) throw new BadRequestException('User identification failed');
        await this.crimeReportsService.deleteReport(id, reporterId);
        return { message: 'Crime report deleted' };
    }

    @Get()
    @ApiOperation({ summary: 'Get all crime reports' })
    @ApiQuery({ name: 'type', description: 'Filter by crime type', required: false })
    @ApiResponse({ status: 200, description: 'Returns all crime reports' })
    async findAll(@Query('type') type?: string) {
        return this.crimeReportsService.findAll(type as CrimeType);
    }

    @UseGuards(AuthGuard)
    @Get('me')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get crime reports created by current user' })
    @ApiResponse({ status: 200, description: 'Returns user crime reports' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async findMine(@Req() req: any) {
        const reporterId = req.user?.userId;
        if (!reporterId) throw new BadRequestException('User identification failed');
        return this.crimeReportsService.findByReporter(reporterId);
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
    @ApiQuery({ name: 'lat', required: true })
    @ApiQuery({ name: 'lng', required: true })
    @ApiQuery({ name: 'radius', required: false })
    @ApiResponse({ status: 200, description: 'Returns nearby crime alerts' })
    async getNearbyAlerts(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('radius') radius: string,
    ) {
        const latitude  = parseFloat(lat);
        const longitude = parseFloat(lng);
        const radiusKm  = radius ? parseFloat(radius) : 5;
        if (isNaN(latitude) || isNaN(longitude)) throw new BadRequestException('Invalid latitude or longitude');
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

    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.Admin)
    @Put(':id/verify')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Admin verify a crime report (Admin only)' })
    @ApiParam({ name: 'id', description: 'Crime report ID' })
    @ApiResponse({ status: 200, description: 'Report successfully verified' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
    @ApiResponse({ status: 404, description: 'Crime report not found' })
    async verifyReport(@Param('id') id: string, @Req() req: any) {
        return this.crimeReportsService.verifyReport(id, req.user.userId);
    }

    @UseGuards(AuthGuard)
    @Post(':id/confirm')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Confirm a crime report (Community verification)' })
    @ApiParam({ name: 'id', description: 'Crime report ID' })
    @ApiResponse({ status: 200, description: 'Report confirmed' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async confirmReport(@Param('id') id: string, @Req() req: any) {
        return this.communityVotingService.confirmReport(id, req.user.userId);
    }

    @UseGuards(AuthGuard)
    @Post(':id/dispute')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Dispute a crime report (Community verification)' })
    @ApiParam({ name: 'id', description: 'Crime report ID' })
    @ApiResponse({ status: 200, description: 'Report disputed' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async disputeReport(@Param('id') id: string, @Req() req: any) {
        return this.communityVotingService.disputeReport(id, req.user.userId);
    }

    @UseGuards(AuthGuard)
    @Get(':id/vote-status')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get vote status for current user on a crime report' })
    @ApiParam({ name: 'id', description: 'Crime report ID' })
    @ApiResponse({ status: 200, description: 'Returns vote status' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getVoteStatus(@Param('id') id: string, @Req() req: any) {
        const userId = req.user?.userId;
        if (!userId) throw new BadRequestException('User identification failed');
        return this.communityVotingService.getVoteStatus(id, userId);
    }
}
