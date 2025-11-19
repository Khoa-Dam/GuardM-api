import { Module } from '@nestjs/common';
import { CrimeReportsService } from './crime-reports.service';
import { CrimeReportsController } from './crime-reports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrimeReport } from '../entities/crime-report.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CrimeReport, User])],
  providers: [CrimeReportsService],
  controllers: [CrimeReportsController],
  exports: [CrimeReportsService],
})
export class CrimeReportsModule { }
