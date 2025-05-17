import cron from 'node-cron';
import { FundCleanupService } from './fundCleanupService';

export class SchedulerService {
  static initializeScheduledTasks() {
    // Run status checks every hour
    cron.schedule('0 * * * *', async () => {
      console.log('Running fund status update task...');
      await FundCleanupService.checkAndUpdateFundStatuses();
    });
  }
} 