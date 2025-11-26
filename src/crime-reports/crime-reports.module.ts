import { Module } from '@nestjs/common';
import { CrimeReportsService } from './crime-reports.service';
import { CrimeReportsController } from './crime-reports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrimeReport } from './entities/crime-report.entity';
import { ReportVote } from './entities/report-vote.entity';
import { User } from '../users/entities/user.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CrimeReport, ReportVote, User]),
    CloudinaryModule
  ],
  providers: [CrimeReportsService],
  controllers: [CrimeReportsController],
  exports: [CrimeReportsService],
})
export class CrimeReportsModule { }
