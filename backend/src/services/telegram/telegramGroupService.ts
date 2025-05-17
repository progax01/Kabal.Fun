import { TelegramManager } from "@wasserstoff/mangi-tg-bot";
import envConfigs from "../../configs/envConfigs";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import bigInt from "big-integer";
import TelegramBot from "node-telegram-bot-api";
import pollServices from "../db/pollServices";

class TelegramGroupService {
  private telegramClient: TelegramManager;
  private bot: TelegramBot;
  private activePollIds: Set<string> = new Set();

  constructor() {
    this.telegramClient = new TelegramManager(
      Number(envConfigs.telegramApiId),
      envConfigs.telegramApiHash,
      envConfigs.telegramSession
    );

    // Initialize the bot if token is available
    if (envConfigs.telegramBotToken) {
      this.bot = new TelegramBot(envConfigs.telegramBotToken, {
        polling: false,
      });
    }
  }

  async connect() {
    try {
      await this.telegramClient.connect();
    } catch (error) {
      console.error("Failed to connect to Telegram:", error);
      throw new Error("Telegram connection failed");
    }
  }

  async createFundGroup(fundName: string, creatorUsername: string) {
    try {
      await this.connect();
      const members = [creatorUsername, envConfigs.telegramBotUsername];
      console.log("Members:", members);
      const sanitizedFundName = this.sanitizeGroupName(fundName);

      const group = await this.telegramClient.createGroup(
        members,
        sanitizedFundName
      );
      const response = group as any;
      const chatInfo = response.updates?.chats?.[0];
      const users = response.updates?.users || [];

      const groupId = chatInfo?.id?.value?.toString();

      // Make creator and bot admins
      if (groupId) {
        try {
          // Make creator admin
          await this.promoteUserToAdmin(groupId, creatorUsername);

          // Make bot admin if it's not already
          if (envConfigs.telegramBotUsername) {
            await this.promoteUserToAdmin(
              groupId,
              envConfigs.telegramBotUsername
            );
          }
        } catch (error) {
          console.error(
            "Failed to set admin privileges, but group was created:",
            error
          );
          // Continue anyway since the group was created
        }
      }

      return {
        groupId: groupId,
        groupTitle: chatInfo?.title,
        participantsCount: chatInfo?.participantsCount,
        createdDate: new Date(chatInfo?.date * 1000),
        participants: users.map((user) => ({
          userId: user.id.value.toString(),
          username: user.username,
          firstName: user.firstName,
          isBot: user.bot,
        })),
      };
    } catch (error) {
      console.error("Failed to create Telegram group:", error);
      throw new Error("Failed to create Telegram group");
    }
  }

  async makeGroupAdmins(groupId: number, userIds: any[]) {
    try {
      const client = new TelegramClient(
        new StringSession(envConfigs.telegramSession),
        Number(envConfigs.telegramApiId),
        envConfigs.telegramApiHash,
        { connectionRetries: 5 }
      );
      await client.connect();

      for (const userId of userIds) {
        const user = await client.getEntity(userId);
        await client.invoke(
          new Api.channels.EditAdmin({
            channel: groupId,
            userId: user,
            adminRights: new Api.ChatAdminRights({
              changeInfo: false,
              postMessages: false,
              editMessages: false,
              deleteMessages: true,
              banUsers: true,
              inviteUsers: true,
              pinMessages: true,
              addAdmins: false,
              manageCall: false,
              anonymous: false,
              manageTopics: true,
            }),
            rank: "Moderator", // Optional custom title
          })
        );
      }
    } catch (error) {
      console.error("Failed to set admin privileges:", error);
      throw new Error("Failed to set admin privileges");
    }
  }

  private sanitizeGroupName(name: string): string {
    // Remove special characters and spaces, add prefix/suffix if needed
    return `${name.replace(/[^a-zA-Z0-9]/g, "_")}_Fund`;
  }

  async addMemberToGroup(groupId: string, username: string) {
    try {
      await this.connect();

      // Get the client
      const client = await this.telegramClient.getClient();

      // First resolve the username to get the user entity
      const result = await client.invoke(
        new Api.contacts.ResolveUsername({
          username: username.replace("@", ""), // Remove @ if present
        })
      );

      if (!result || !result.users || result.users.length === 0) {
        throw new Error(`User ${username} not found`);
      }

      const user = result.users[0];

      // Add the user to the group
      await client.invoke(
        new Api.messages.AddChatUser({
          chatId: bigInt(groupId),
          userId: user,
          fwdLimit: 100,
        })
      );

      return { success: true };
    } catch (error) {
      console.error("Failed to add member to group:", error);
      throw new Error("Failed to add member to group");
    }
  }

  //   async removeMemberFromGroup(groupId: number, username: string) {
  //     try {
  //       await this.connect();
  //       await this.telegramClient.banChatMember(groupId, username);
  //     } catch (error) {
  //       console.error("Failed to remove member from group:", error);
  //       throw new Error("Failed to remove member from group");
  //     }
  //   }

  async promoteUserToAdmin(groupId: string, username: string) {
    try {
      await this.connect();

      // Get the client
      const client = await this.telegramClient.getClient();

      // First, search for the user to get their entity
      const result = await client.invoke(
        new Api.contacts.ResolveUsername({
          username: username.replace("@", ""), // Remove @ if present
        })
      );

      if (!result || !result.users || result.users.length === 0) {
        throw new Error(`User ${username} not found`);
      }

      const user = result.users[0];
      console.log("Found user:", user);

      // Skip getting the channel entity - just use the ID directly
      // const channel = await client.getEntity(groupId);
      // console.log("Found channel:", channel);

      // Try using the user directly instead of InputPeerUser
      await client.invoke(
        new Api.messages.EditChatAdmin({
          chatId: bigInt(groupId),
          userId: user,
          isAdmin: true,
        })
      );

      return { success: true, user: user };
    } catch (error) {
      console.error(`Failed to promote user ${username} to admin:`, error);
      throw new Error("Failed to promote user to admin");
    }
  }

  async createPollInGroup(
    fundId: string,
    groupId: string,
    question: string,
    options: string[],
    isAnonymous: boolean = true,
    allowsMultipleAnswers: boolean = false,
    closeAfterMinutes: number = 0
  ) {
    try {
      if (!this.bot) {
        throw new Error("Bot not initialized. Check if token is configured.");
      }

      if (!groupId.startsWith("-")) {
        groupId = `-${groupId}`;
      }

      // Calculate close date if specified
      let closeDate = undefined;
      if (closeAfterMinutes > 0) {
        closeDate = Math.floor(Date.now() / 1000) + closeAfterMinutes * 60;
      }

      // Send poll using node-telegram-bot-api
      const pollResult = await this.bot.sendPoll(groupId, question, options, {
        is_anonymous: isAnonymous,
        allows_multiple_answers: allowsMultipleAnswers,
        close_date: closeDate,
      });

      console.log(`Bot successfully created poll in group ${groupId}`);

      // Save the poll to the database
      await pollServices.createPoll({
        fundId,
        telegramGroupId: groupId,
        pollId: pollResult.poll.id,
        messageId: pollResult.message_id,
        question,
        options,
        isAnonymous,
        allowsMultipleAnswers,
      });

      // Track this poll for updates
      this.trackPoll(pollResult.poll.id);

      // If we have a close date, set up a timer to get results when poll closes
      if (closeDate) {
        const timeToClose = (closeDate - Math.floor(Date.now() / 1000)) * 1000;
        console.log(`Poll will close in ${timeToClose / 1000} seconds`);

        // Set a timeout to get poll results after it closes
        setTimeout(async () => {
          try {
            // Instead of using getUpdates, try to get the poll from the database
            const savedPoll = await pollServices.getPollById(
              pollResult.poll.id
            );

            if (savedPoll && savedPoll.options) {
              console.log("Using saved poll data for results:", savedPoll);

              // Send a message with the saved results
              let resultMessage = `📊 Poll Results: "${question}"\n\n`;
              savedPoll.options.forEach((option) => {
                const percentage =
                  savedPoll.totalVoterCount > 0
                    ? Math.round(
                        (option.voter_count / savedPoll.totalVoterCount) * 100
                      )
                    : 0;
                resultMessage += `${option.text}: ${option.voter_count} votes (${percentage}%)\n`;
              });
              resultMessage += `\nTotal votes: ${savedPoll.totalVoterCount}`;

              this.bot.sendMessage(groupId, resultMessage);

              // Mark the poll as closed in the database if it's not already
              if (!savedPoll.isClosed) {
                await pollServices.updatePollResults(savedPoll.pollId, {
                  options: savedPoll.options,
                  totalVoterCount: savedPoll.totalVoterCount,
                  isClosed: true,
                });
              }
            } else {
              // If we don't have poll data, send a generic message
              this.bot.sendMessage(
                groupId,
                "Poll has closed. Thank you for participating!"
              );
            }
          } catch (error) {
            console.error("Error handling poll close:", error);
            this.bot.sendMessage(
              groupId,
              "Poll has closed. Thank you for participating!"
            );
          }
        }, timeToClose + 1000); // Add 1 second buffer
      }

      return {
        success: true,
        messageId: pollResult.message_id,
        pollId: pollResult.poll.id,
        closeDate: closeDate ? new Date(closeDate * 1000) : undefined,
        result: pollResult,
      };
    } catch (error) {
      console.error(`Failed to create poll in group ${groupId}:`, error);
      throw new Error(`Failed to create poll: ${error.message}`);
    }
  }

  // Add a method to track a specific poll
  trackPoll(pollId: string) {
    this.activePollIds.add(pollId);
  }

  // Add a method to stop tracking a specific poll
  untrackPoll(pollId: string) {
    this.activePollIds.delete(pollId);
  }

  async setupBotCommands() {
    if (!this.bot) {
      console.error("Bot not initialized. Check if token is configured.");
      return;
    }

    console.log("Setting up Telegram bot commands...");

    // Set up the /poll command
    this.bot.onText(/\/poll (.+)/, async (msg, match) => {
      try {
        const chatId = msg.chat.id.toString();
        const userId = msg.from?.id.toString();

        if (!userId) {
          return this.bot.sendMessage(chatId, "Could not identify user");
        }

        // Check if the user is an admin
        const isAdmin = await this.isUserAdmin(chatId, userId);
        if (!isAdmin) {
          return this.bot.sendMessage(
            chatId,
            "Only group admins can create polls"
          );
        }

        // Find the fund associated with this group
        const fund = await this.getFundByGroupId(chatId);
        if (!fund) {
          return this.bot.sendMessage(
            chatId,
            "This group is not associated with any fund"
          );
        }

        // Parse the command arguments
        // Format: /poll Question? | Option 1 | Option 2 | Option 3 | [minutes]
        const args = match[1].split("|").map((arg) => arg.trim());

        // Validate minimum arguments (question + at least 2 options)
        if (args.length < 3) {
          return this.bot.sendMessage(
            chatId,
            "Format: /poll Question? | Option 1 | Option 2 | ... | [minutes]\n" +
              "You need at least 2 options for a poll.\n" +
              "Minutes parameter is optional - default is 60 minutes (1 hour)."
          );
        }

        // Validate question
        const question = args[0];
        if (!question || question.length < 3) {
          return this.bot.sendMessage(
            chatId,
            "Please provide a valid question with at least 3 characters."
          );
        }

        // Get options
        const options = args.slice(1);

        // Check if the last argument is a number (minutes)
        let closeAfterMinutes = 60; // Default to 1 hour
        const lastArg = options[options.length - 1];

        if (!isNaN(Number(lastArg))) {
          closeAfterMinutes = Number(lastArg);
          options.pop(); // Remove the minutes from options
        }

        // Validate options after potentially removing minutes
        if (options.length < 2) {
          return this.bot.sendMessage(
            chatId,
            "You need at least 2 options for a poll."
          );
        }

        // Validate option content
        const invalidOptions = options.filter((opt) => !opt || opt.length < 1);
        if (invalidOptions.length > 0) {
          return this.bot.sendMessage(
            chatId,
            "All options must contain text. Please check your poll format."
          );
        }

        // Create the poll
        const pollResult = await this.createPollInGroup(
          fund._id.toString(),
          chatId,
          question,
          options,
          true, // isAnonymous
          false, // allowsMultipleAnswers
          closeAfterMinutes
        );

        this.bot.sendMessage(
          chatId,
          `Poll created successfully and will close in ${closeAfterMinutes} minutes`
        );
      } catch (error) {
        console.error("Error handling poll command:", error);
        this.bot.sendMessage(msg.chat.id, `Error: ${error.message}`);
      }
    });

    // Update the help command to reflect the default timer
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(
        chatId,
        "Available commands:\n" +
          "/poll Question? | Option 1 | Option 2 | ... | [minutes] - Create a poll with multiple options (admin only)\n" +
          "  - Question must be at least 3 characters\n" +
          "  - You must provide at least 2 options\n" +
          "  - Minutes parameter is optional (defaults to 60 minutes/1 hour)\n" +
          "/help - Show this help message"
      );
    });

    // Start polling if not already polling
    if (!this.bot.isPolling()) {
      // Set up poll update handlers before starting polling
      this.bot.on("poll", async (poll) => {
        // Check if this is one of our tracked polls
        if (this.activePollIds.has(poll.id)) {
          console.log(`Poll update received for ${poll.id}:`, poll);

          // Save poll results to the database
          try {
            await pollServices.updatePollResults(poll.id, {
              options: poll.options,
              totalVoterCount: poll.total_voter_count,
              isClosed: poll.is_closed,
            });
          } catch (error) {
            console.error(`Error saving poll update for ${poll.id}:`, error);
          }

          // If poll is closed, remove from tracking
          if (poll.is_closed) {
            this.activePollIds.delete(poll.id);
          }
        }
      });

      // Listen for poll answers
      this.bot.on("poll_answer", (pollAnswer) => {
        if (this.activePollIds.has(pollAnswer.poll_id)) {
          console.log(
            `Poll answer received for ${pollAnswer.poll_id}:`,
            pollAnswer
          );
        }
      });

      // Start polling
      this.bot.startPolling();
      console.log("Bot polling started");
    }
  }

  // Helper method to check if a user is an admin in a group
  async isUserAdmin(chatId: string, userId: string): Promise<boolean> {
    try {
      const chatAdmins = await this.bot.getChatAdministrators(chatId);
      return chatAdmins.some((admin) => admin.user.id.toString() === userId);
    } catch (error) {
      console.error(
        `Error checking admin status for user ${userId} in chat ${chatId}:`,
        error
      );
      return false;
    }
  }

  // Helper method to get fund by group ID
  async getFundByGroupId(groupId: string): Promise<any> {
    try {
      // Remove the minus sign if present
      const cleanGroupId = groupId.startsWith("-")
        ? groupId.substring(1)
        : groupId;

      // Import Fund model dynamically to avoid circular dependencies
      const Fund = require("../../models/fundModel").default;

      // Find the fund with this group ID
      return await Fund.findOne({
        telegramGroupId: { $in: [cleanGroupId, groupId] },
      });
    } catch (error) {
      console.error(`Error getting fund by group ID ${groupId}:`, error);
      return null;
    }
  }
}

export default new TelegramGroupService();
