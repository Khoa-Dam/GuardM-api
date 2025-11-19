import { Test, TestingModule } from '@nestjs/testing';
import { CrimeReportsService } from '../crime-reports.service';

describe('CrimeReportsService', () => {
  let service: CrimeReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrimeReportsService],
    }).compile();

    service = module.get<CrimeReportsService>(CrimeReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
