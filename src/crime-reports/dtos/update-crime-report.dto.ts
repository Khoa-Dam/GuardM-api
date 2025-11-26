import { PartialType } from '@nestjs/swagger';
import { CreateCrimeReportDto } from './create-crime-report.dto';

export class UpdateCrimeReportDto extends PartialType(CreateCrimeReportDto) { }

