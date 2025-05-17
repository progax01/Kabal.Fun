import crypto from "crypto";
import envConfigs from "../../configs/envConfigs";

class TelegramAuthService {
  private botToken: string;

  constructor() {
    this.botToken = envConfigs.telegramBotToken;
  }

  validateTelegramAuth(authData: any): boolean {
    const { hash, ...data } = authData;

    // Create a sorted array of key-value pairs excluding hash
    const dataCheckArr = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join("\n");

    // Create a secret key using SHA256
    const secretKey = crypto
      .createHash("sha256")
      .update(this.botToken)
      .digest();

    // Calculate hash using HMAC SHA256
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckArr)
      .digest("hex");

    return calculatedHash === hash;
  }

  async getTelegramUserData(authData: any) {
    if (!this.validateTelegramAuth(authData)) {
      throw new Error("Invalid telegram authentication data");
    }

    return {
      id: authData.id,
      firstName: authData.first_name,
      lastName: authData.last_name,
      username: authData.username,
      photoUrl: authData.photo_url,
      authDate: authData.auth_date,
    };
  }
}

export default new TelegramAuthService();
