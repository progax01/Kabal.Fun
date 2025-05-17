import "dotenv/config";

interface IEnvConfigs {
  port: string | undefined;
  dbUrl: string;
  twitterClientId: string;
  twitterClientSecret: string;
  solanaRpcUrl: string;
  coinmarketcapApiKey: string;
  solTokenAddress: string;
  feePercentage: string;
  cloudflareAccountId: string;
  cloudflareApiToken: string;
  telegramApiId: string;
  telegramApiHash: string;
  telegramSession: string;
  telegramBotToken: string;
  telegramBotUsername: string;
}

const envConfigs: IEnvConfigs = {
  port: process.env.PORT,
  dbUrl: process.env.DB_URL as string,
  twitterClientId: process.env.TWITTER_CLIENT_ID as string,
  twitterClientSecret: process.env.TWITTER_CLIENT_SECRET as string,
  solanaRpcUrl:
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  coinmarketcapApiKey: process.env.COINMARKETCAP_API_KEY as string,
  solTokenAddress: process.env.SOL_TOKEN_ADDRESS as string,
  feePercentage: process.env.FEE_PERCENTAGE as string,
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN || "",
  telegramApiId: process.env.TELEGRAM_API_ID || "",
  telegramApiHash: process.env.TELEGRAM_API_HASH || "",
  telegramSession: process.env.TELEGRAM_SESSION || "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || "",
};

export default envConfigs;
