import { Injectable } from '@nestjs/common';
import { WantedCriminalsService } from './wanted-criminals/wanted-criminals.service';

@Injectable()
export class AppService {
  constructor(
    private wantedCriminalsService: WantedCriminalsService,
  ) { }

  getHello(): string {
    return 'Hello World!';
  }

  async getHomePageData() {
    const [wantedCriminals, wantedStatistics] = await Promise.all([
      this.wantedCriminalsService.findAll().then(criminals => criminals.slice(0, 6)),
      this.getWantedCriminalsStatistics(),
    ]);

    return {
      recentWantedCriminals: wantedCriminals,
      statistics: wantedStatistics,
    };
  }

  private async getWantedCriminalsStatistics() {
    const allWanted = await this.wantedCriminalsService.findAll();

    return {
      totalWanted: allWanted.length,
    };
  }
}
