import { Controller, Get, Post, Body, Param, Req, UseGuards, Query, UploadedFiles, BadRequestException, Put, Logger, Delete, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CrimeType } from '../enums/crime-type.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { CrimeReportsService } from './crime-reports.service';
import { CreateCrimeReportDto } from './dtos/create-crime-report.dto';
import { UpdateCrimeReportDto } from './dtos/update-crime-report.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('crime-reports')
@Controller('crime-reports')
export class CrimeReportsController {
    constructor(
        private readonly crimeReportsService: CrimeReportsService,
        private readonly cloudinaryService: CloudinaryService) { }

    private readonly logger = new Logger(CrimeReportsController.name);

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
        @UploadedFiles() files: Array<Express.Multer.File>, // Nhận danh sách file
        @Body() createReportDto: CreateCrimeReportDto,      // Nhận data text
        @Req() req: any,
    ) {
        const reporterId = req.user?.userId;

        if (!reporterId) {
            throw new BadRequestException('User identification failed');
        }

        let uploadedPublicIds: string[] = [];

        try {
            const attachmentUrls: string[] = [];

            // 1. Upload files from multipart/form-data
            if (files && files.length > 0) {
                const uploadResults = await Promise.all(files.map(file => this.cloudinaryService.uploadImage(file)));

                uploadedPublicIds = uploadResults
                    .map(result => ('public_id' in result ? result.public_id : undefined))
                    .filter((publicId): publicId is string => !!publicId);

                const imageUrls = uploadResults.map(result => ('secure_url' in result ? result.secure_url : undefined)).filter(Boolean) as string[];
                attachmentUrls.push(...imageUrls);
            }

            // 2. Upload base64 strings from attachments array (if any)
            if (createReportDto.attachments && Array.isArray(createReportDto.attachments)) {
                const base64UploadPromises = createReportDto.attachments
                    .filter(att => typeof att === 'string' && this.cloudinaryService.isBase64DataUrl(att))
                    .map(base64Str =>
                        this.cloudinaryService.uploadFromBase64(base64Str)
                            .then(result => {
                                if ('public_id' in result) {
                                    uploadedPublicIds.push(result.public_id);
                                }
                                return 'secure_url' in result ? result.secure_url : undefined;
                            })
                            .catch(error => {
                                this.logger.error('Failed to upload base64 to Cloudinary', error.stack);
                                return undefined;
                            })
                    );

                const base64Urls = await Promise.all(base64UploadPromises);
                attachmentUrls.push(...base64Urls.filter(Boolean) as string[]);
            }

            // 3. Keep existing URLs (non-base64) from attachments
            if (createReportDto.attachments && Array.isArray(createReportDto.attachments)) {
                const existingUrls = createReportDto.attachments.filter(
                    att => typeof att === 'string' && !this.cloudinaryService.isBase64DataUrl(att)
                ) as string[];
                attachmentUrls.push(...existingUrls);
            }

            // 4. Set final attachments (only URLs, no base64)
            createReportDto.attachments = attachmentUrls.length > 0 ? attachmentUrls : undefined;

            return await this.crimeReportsService.create(reporterId, createReportDto);
        } catch (error) {
            if (uploadedPublicIds.length > 0) {
                await Promise.all(
                    uploadedPublicIds.map(publicId =>
                        this.cloudinaryService.deleteImage(publicId).catch(cleanupError =>
                            this.logger.error(`Failed to delete Cloudinary asset ${publicId}`, cleanupError.stack),
                        ),
                    ),
                );
            }
            throw error;
        }
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

        if (!reporterId) {
            throw new BadRequestException('User identification failed');
        }

        let uploadedPublicIds: string[] = [];

        try {
            const attachmentUrls: string[] = [];

            // 1. Upload files from multipart/form-data
            if (files && files.length > 0) {
                const uploadResults = await Promise.all(files.map(file => this.cloudinaryService.uploadImage(file)));

                uploadedPublicIds = uploadResults
                    .map(result => ('public_id' in result ? result.public_id : undefined))
                    .filter((publicId): publicId is string => !!publicId);

                const imageUrls = uploadResults
                    .map(result => ('secure_url' in result ? result.secure_url : undefined))
                    .filter(Boolean) as string[];
                attachmentUrls.push(...imageUrls);
            }

            // 2. Process existing attachments from request body (keep URLs, upload base64)
            if (updateReportDto.attachments) {
                // Handle case where attachments is sent as JSON string
                let attachmentsArray: string[] = [];
                if (typeof updateReportDto.attachments === 'string') {
                    try {
                        attachmentsArray = JSON.parse(updateReportDto.attachments);
                    } catch {
                        attachmentsArray = [updateReportDto.attachments];
                    }
                } else if (Array.isArray(updateReportDto.attachments)) {
                    attachmentsArray = updateReportDto.attachments;
                }

                // Keep existing URLs (non-base64)
                const existingUrls = attachmentsArray.filter(
                    att => typeof att === 'string' && att.length > 0 && !this.cloudinaryService.isBase64DataUrl(att)
                ) as string[];
                attachmentUrls.push(...existingUrls);

                // Upload base64 strings
                const base64UploadPromises = attachmentsArray
                    .filter(att => typeof att === 'string' && this.cloudinaryService.isBase64DataUrl(att))
                    .map(base64Str =>
                        this.cloudinaryService.uploadFromBase64(base64Str)
                            .then(result => {
                                if ('public_id' in result) {
                                    uploadedPublicIds.push(result.public_id);
                                }
                                return 'secure_url' in result ? result.secure_url : undefined;
                            })
                            .catch(error => {
                                this.logger.error('Failed to upload base64 to Cloudinary', error.stack);
                                return undefined;
                            })
                    );

                const base64Urls = await Promise.all(base64UploadPromises);
                attachmentUrls.push(...base64Urls.filter(Boolean) as string[]);
            }

            // 3. Set final attachments - always set array (even empty) to allow deletion
            updateReportDto.attachments = attachmentUrls;

            return await this.crimeReportsService.updateReport(id, reporterId, updateReportDto);
        } catch (error) {
            if (uploadedPublicIds.length > 0) {
                await Promise.all(
                    uploadedPublicIds.map(publicId =>
                        this.cloudinaryService.deleteImage(publicId).catch(cleanupError =>
                            this.logger.error(`Failed to delete Cloudinary asset ${publicId}`, cleanupError.stack),
                        ),
                    ),
                );
            }
            throw error;
        }
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

        if (!reporterId) {
            throw new BadRequestException('User identification failed');
        }

        await this.crimeReportsService.deleteReport(id, reporterId);

        return { message: 'Crime report deleted' };
    }

    @Get()
    @ApiOperation({ summary: 'Get all crime reports' })
    @ApiQuery({ name: 'type', description: 'Filter by crime type', required: false, enum: ['truy_na', 'nghi_pham', 'dang_ngo', 'de_doa', 'giet_nguoi', 'bat_coc', 'cuop_giat', 'trom_cap'] })
    @ApiResponse({ status: 200, description: 'Returns all crime reports' })
    async findAll(@Query('type') type?: string) {
        return this.crimeReportsService.findAll(type as any);
    }

    @UseGuards(AuthGuard)
    @Get('me')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get crime reports created by current user' })
    @ApiResponse({ status: 200, description: 'Returns user crime reports' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async findMine(@Req() req: any) {
        const reporterId = req.user?.userId;

        if (!reporterId) {
            throw new BadRequestException('User identification failed');
        }

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
    @ApiResponse({ status: 400, description: 'Không thể xác nhận báo cáo của chính mình' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Crime report not found' })
    async confirmReport(@Param('id') id: string, @Req() req: any) {
        return this.crimeReportsService.confirmReport(id, req.user.userId);
    }

    @UseGuards(AuthGuard)
    @Post(':id/dispute')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Dispute a crime report (Community verification)' })
    @ApiParam({ name: 'id', description: 'Crime report ID' })
    @ApiResponse({ status: 200, description: 'Report disputed' })
    @ApiResponse({ status: 400, description: 'Không thể tranh cãi báo cáo của chính mình' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Crime report not found' })
    async disputeReport(@Param('id') id: string, @Req() req: any) {
        return this.crimeReportsService.disputeReport(id, req.user.userId);
    }

    @UseGuards(AuthGuard)
    @Get(':id/vote-status')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get vote status of current user for a crime report' })
    @ApiParam({ name: 'id', description: 'Crime report ID' })
    @ApiResponse({ status: 200, description: 'Returns vote status' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Crime report not found' })
    async getVoteStatus(@Param('id') id: string, @Req() req: any) {
        const userId = req.user?.userId;
        if (!userId) {
            throw new BadRequestException('User identification failed');
        }
        return this.crimeReportsService.getVoteStatus(id, userId);
    }
}
