import FundRankingHistory from "../../models/fundRankingHistoryModel";
import { Types } from "mongoose";

class FundRankingService {
  /**
   * Save a snapshot of current fund rankings
   */
  static async saveRankingSnapshot(rankingType: 'price' | 'aum', rankings: Array<{fundId: string, position: number}>) {
    try {
      // Create a new snapshot with today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const snapshot = new FundRankingHistory({
        snapshotDate: today, // Make sure this is a Date object, not a number
        rankingType,
        rankings: rankings.map(rank => ({
          fundId: typeof rank.fundId === 'string' ? new Types.ObjectId(rank.fundId) : rank.fundId,
          position: rank.position
        }))
      });
      
      await snapshot.save();
      return snapshot;
    } catch (error: any) {
      console.error(`Error saving ranking snapshot: ${error.message}`);
      throw new Error(`Failed to save ranking snapshot: ${error.message}`);
    }
  }
  
  /**
   * Get the most recent ranking snapshot before the given date
   */
  static async getPreviousRanking(rankingType: 'price' | 'aum', beforeDate: Date = new Date()) {
    try {
      return await FundRankingHistory.findOne({
        rankingType,
        snapshotDate: { $lt: beforeDate }
      })
      .sort({ snapshotDate: -1 })
      .lean();
    } catch (error: any) {
      console.error(`Error getting previous ranking: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get a fund's position change between current and previous ranking
   */
  static async getFundPositionChange(fundId: string, rankingType: 'price' | 'aum') {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get today's ranking
      const currentRanking = await FundRankingHistory.findOne({
        rankingType,
        snapshotDate: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }).lean();
      
      
      // If there's no current ranking, we'll use the current position from the leaderboard
      if (!currentRanking) {
        return { 
          currentPosition: null, 
          previousPosition: null, 
          change: 0 
        };
      }
      
      // Get the fund's current position
      const currentPosition = currentRanking.rankings.find(
        r => r.fundId.toString() === fundId
      )?.position;
      
      if (currentPosition === undefined) {
        return { 
          currentPosition: null, 
          previousPosition: null, 
          change: 0 
        };
      }
      
      // Get previous day's ranking
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const previousRanking = await this.getPreviousRanking(rankingType, yesterday);
      
      if (!previousRanking) {
        return { 
          currentPosition, 
          previousPosition: null, 
          change: 0 
        };
      }
      
      // Get the fund's previous position
      const previousPosition = previousRanking.rankings.find(
        r => r.fundId.toString() === fundId
      )?.position;
      
      if (previousPosition === undefined) {
        return { 
          currentPosition, 
          previousPosition: null, 
          change: 0 
        };
      }
      
      // Calculate position change (positive means improved ranking)
      const change = previousPosition - currentPosition;
      
      return {
        currentPosition,
        previousPosition,
        change
      };
    } catch (error: any) {
      console.error(`Error getting fund position change: ${error.message}`);
      return null;
    }
  }
}

export default FundRankingService; 