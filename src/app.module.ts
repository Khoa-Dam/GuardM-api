import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { CrimeReport } from './crime-reports/entities/crime-report.entity';
import { ReportVote } from './crime-reports/entities/report-vote.entity';
import { WantedCriminal } from './wanted-criminals/entities/wanted-criminal.entity';
import { WeatherNews } from './weather-news/entities/weather-news.entity';
import { CrimeReportsModule } from './crime-reports/crime-reports.module';
import { WantedCriminalsModule } from './wanted-criminals/wanted-criminals.module';
import { ScraperModule } from './scraper/scraper.module';
import { WeatherNewsModule } from './weather-news/weather-news.module';
import { HealthModule } from './health/health.module';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        type DatabaseConfig = ReturnType<typeof configuration>['database'];

        const db = configService.get<DatabaseConfig>('database');
        if (!db) {
          throw new Error('Database configuration is missing');
        }
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.user,
          password: db.password,
          database: db.name,
          entities: [User, RefreshToken, CrimeReport, ReportVote, WantedCriminal, WeatherNews],
          synchronize: process.env.NODE_ENV !== 'production',
        };
      },
    }),
    UsersModule,
    AuthModule,
    CrimeReportsModule,
    WantedCriminalsModule,
    ScraperModule,
    WeatherNewsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(@InjectConnection() private connection: Connection) { }

  async onModuleInit() {
    // Run PostGIS migration
    const migrationPath = path.join(__dirname, '../migrations/add-postgis-column.sql');
    if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf8');
      try {
        await this.connection.query(migration);
        console.log('PostGIS extension and geom column added successfully');
      } catch (error) {
        console.log('PostGIS migration error (may already exist):', error.message);
      }
    }
  }
}
