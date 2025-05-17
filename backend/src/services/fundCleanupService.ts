import Fund from '../models/fundModel';
import FundAsset from '../models/fundAssetModel';
import UserHolding from '../models/userHoldingModel';
import FundPriceHistory from '../models/fundPriceHistoryModel';

export class FundCleanupService {
  static async checkAndUpdateFundStatuses() {
    try {
      const now = new Date();
      
      // 1. Check fundraising funds that didn't meet target within 3 days
      const failedFundraisingFunds = await Fund.find({
        fundStatus: 'fundraising',
        thresholdDeadline: { $lt: now },
        currentAUM: { $lt: '$targetRaiseAmount' }
      });

      for (const fund of failedFundraisingFunds) {
        await this.handleFailedFundraising(fund);
      }

      // 2. Check funds that met their target
      const successfulFundraisingFunds = await Fund.find({
        fundStatus: 'fundraising',
        currentAUM: { $gte: '$targetRaiseAmount' }
      });

      for (const fund of successfulFundraisingFunds) {
        await Fund.findByIdAndUpdate(fund._id, {
          fundStatus: 'trading'
        });
        // Here you might want to trigger any necessary on-chain transactions
        // or notifications to indicate the fund is now trading
      }

      // 3. Check for expired trading funds (3 months old)
      const expiredTradingFunds = await Fund.find({
        fundStatus: 'trading',
        expirationDate: { $lt: now }
      });

      for (const fund of expiredTradingFunds) {
        await this.handleExpiredTrading(fund);
      }

      console.log(`
        Updated Funds:
        - Failed Fundraising: ${failedFundraisingFunds.length}
        - Started Trading: ${successfulFundraisingFunds.length}
        - Expired Trading: ${expiredTradingFunds.length}
      `);

    } catch (error) {
      console.error('Error in checkAndUpdateFundStatuses:', error);
    }
  }

  private static async handleFailedFundraising(fund: any) {
    try {
      // Update fund status
      await Fund.findByIdAndUpdate(fund._id, {
        isActive: false,
        fundStatus: 'expired'
      });

      // Cleanup related records
      await Promise.all([
        FundAsset.deleteMany({ fundId: fund._id }),
        UserHolding.deleteMany({ fundId: fund._id }),
        FundPriceHistory.deleteMany({ fundId: fund._id })
      ]);

      // TODO: Implement refund logic for any investments made
      // TODO: Send notifications to fund manager and investors
      // TODO: Clean up any on-chain data

    } catch (error) {
      console.error(`Error handling failed fundraising for fund ${fund._id}:`, error);
    }
  }

  private static async handleExpiredTrading(fund: any) {
    try {
      // Update fund status
      await Fund.findByIdAndUpdate(fund._id, {
        isActive: false,
        fundStatus: 'expired'
      });

      // TODO: Implement fund closure logic
      // 1. Notify all stakeholders
      // 2. Handle final distributions
      // 3. Archive fund data
      // 4. Clean up on-chain state

    } catch (error) {
      console.error(`Error handling expired trading fund ${fund._id}:`, error);
    }
  }
} 