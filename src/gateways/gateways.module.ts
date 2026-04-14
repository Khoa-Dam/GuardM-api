import { Module } from '@nestjs/common';
import { CrimeReportsGateway } from './crime-reports.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ReportBroadcastListener } from './listeners/report-broadcast.listener';

@Module({
    imports: [JwtModule],
    providers: [CrimeReportsGateway, ReportBroadcastListener],
    exports: [CrimeReportsGateway],
})
export class GatewaysModule {}
