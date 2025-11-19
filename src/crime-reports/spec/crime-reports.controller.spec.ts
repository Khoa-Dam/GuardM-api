import { Test, TestingModule } from '@nestjs/testing';
import { CrimeReportsController } from '../crime-reports.controller';

describe('CrimeReportsController', () => {
  let controller: CrimeReportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrimeReportsController],
    }).compile();

    controller = module.get<CrimeReportsController>(CrimeReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
