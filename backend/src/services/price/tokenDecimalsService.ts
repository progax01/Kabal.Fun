import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import envConfigs from '../../configs/envConfigs';

class TokenDecimalsService {
  private connection: Connection;
  private decimalsCache: Record<string, number> = {};
  
  // Common token decimals for quick reference
  private readonly COMMON_DECIMALS: Record<string, number> = {
    'So11111111111111111111111111111111111111112': 9, // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6, // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6, // USDT
    '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E': 8, // BTC (Wrapped)
    '2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk': 6, // ETH (Wrapped)
  };
  
  constructor() {
    this.connection = new Connection(envConfigs.solanaRpcUrl);
  }
  
  /**
   * Get the decimals for a token
   */
  async getTokenDecimals(mintAddress: string): Promise<number> {
    try {
      // Check cache first
      if (this.decimalsCache[mintAddress]) {
        return this.decimalsCache[mintAddress];
      }
      
      // Check common tokens
      if (this.COMMON_DECIMALS[mintAddress]) {
        this.decimalsCache[mintAddress] = this.COMMON_DECIMALS[mintAddress];
        return this.COMMON_DECIMALS[mintAddress];
      }
      
      // Fetch from blockchain
      const mintInfo = await getMint(
        this.connection,
        new PublicKey(mintAddress)
      );
      
      const decimals = mintInfo.decimals;
      
      // Cache the result
      this.decimalsCache[mintAddress] = decimals;
      
      return decimals;
    } catch (error: any) {
      console.error(`Error getting decimals for ${mintAddress}:`, error);
      // Default to 9 decimals (like SOL) if we can't determine
      return 9;
    }
  }
  
  /**
   * Preload decimals for common tokens
   */
  preloadCommonTokens() {
    // Add common tokens to cache
    Object.entries(this.COMMON_DECIMALS).forEach(([address, decimals]) => {
      this.decimalsCache[address] = decimals;
    });
  }
}

export default new TokenDecimalsService(); 