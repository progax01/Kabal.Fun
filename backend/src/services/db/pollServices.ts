import Poll, { IPollDocument, IPollOption } from "../../models/pollModel";
import { Types } from "mongoose";
import fundServices from "./fundServices";

class PollServices {
  async createPoll(pollData: {
    fundId: string | Types.ObjectId;
    telegramGroupId: string;
    pollId: string;
    messageId: number;
    question: string;
    options: string[];
    isAnonymous: boolean;
    allowsMultipleAnswers: boolean;
  }): Promise<IPollDocument> {
    try {
      // Convert options to the format needed by the schema
      const formattedOptions: IPollOption[] = pollData.options.map((text) => ({
        text,
        voter_count: 0,
      }));

      const poll = new Poll({
        fundId: pollData.fundId,
        telegramGroupId: pollData.telegramGroupId,
        pollId: pollData.pollId,
        messageId: pollData.messageId,
        question: pollData.question,
        options: formattedOptions,
        isAnonymous: pollData.isAnonymous,
        allowsMultipleAnswers: pollData.allowsMultipleAnswers,
        isClosed: false,
      });

      await poll.save();
      return poll;
    } catch (error) {
      console.error("Error creating poll:", error);
      throw new Error(`Failed to create poll: ${error.message}`);
    }
  }

  async updatePollResults(
    pollId: string,
    pollData: {
      options: IPollOption[];
      totalVoterCount: number;
      isClosed: boolean;
    }
  ): Promise<IPollDocument | null> {
    try {
      const updateData: any = {
        options: pollData.options,
        totalVoterCount: pollData.totalVoterCount,
      };

      if (pollData.isClosed) {
        updateData.isClosed = true;
        updateData.closedAt = new Date();
      }

      const updatedPoll = await Poll.findOneAndUpdate({ pollId }, updateData, {
        new: true,
      });

      return updatedPoll;
    } catch (error) {
      console.error(`Error updating poll ${pollId}:`, error);
      throw new Error(`Failed to update poll: ${error.message}`);
    }
  }

  async getPollsByFundId(
    fundId: string | Types.ObjectId
  ): Promise<IPollDocument[]> {
    try {
      return await Poll.find({ fundId }).sort({ createdAt: -1 });
    } catch (error) {
      console.error(`Error getting polls for fund ${fundId}:`, error);
      throw new Error(`Failed to get polls: ${error.message}`);
    }
  }

  async getPollsByFundAddress(fundAddress: string): Promise<IPollDocument[]> {
    try {
      const fund = await fundServices.getFundByAddress(fundAddress);
      if (!fund) {
        throw new Error(`Fund with address ${fundAddress} not found`);
      }
      return this.getPollsByFundId(fund._id as string);
    } catch (error) {
      console.error(
        `Error getting polls for fund address ${fundAddress}:`,
        error
      );
      throw new Error(`Failed to get polls: ${error.message}`);
    }
  }

  async getPollsByGroupId(telegramGroupId: string): Promise<IPollDocument[]> {
    try {
      return await Poll.find({ telegramGroupId }).sort({ createdAt: -1 });
    } catch (error) {
      console.error(`Error getting polls for group ${telegramGroupId}:`, error);
      throw new Error(`Failed to get polls: ${error.message}`);
    }
  }

  async getPollById(pollId: string): Promise<IPollDocument | null> {
    try {
      return await Poll.findOne({ pollId });
    } catch (error) {
      console.error(`Error getting poll ${pollId}:`, error);
      throw new Error(`Failed to get poll: ${error.message}`);
    }
  }
}

export default new PollServices();
