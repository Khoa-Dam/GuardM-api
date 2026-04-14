import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrimeReport } from '../crime-reports/entities/crime-report.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([CrimeReport]), AuthModule],
    providers: [AiService],
    controllers: [AiController],
    exports: [AiService],
})
export class AiModule {}
