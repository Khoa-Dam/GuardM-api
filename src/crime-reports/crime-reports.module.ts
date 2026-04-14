import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrimeReportsService } from './crime-reports.service';
import { CrimeReportsController } from './crime-reports.controller';
import { CrimeReport } from './entities/crime-report.entity';
import { ReportVote } from './entities/report-vote.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { TrustScoreService } from './trust-score.service';
import { CommunityVotingService } from './community-voting.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([CrimeReport, ReportVote]),
        CloudinaryModule,
    ],
    providers: [CrimeReportsService, TrustScoreService, CommunityVotingService],
    controllers: [CrimeReportsController],
    exports: [CrimeReportsService],
})
export class CrimeReportsModule {}
