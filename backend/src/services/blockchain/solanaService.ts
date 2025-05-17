import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import envConfigs from '../../configs/envConfigs';

class SolanaService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(envConfigs.solanaRpcUrl);
  }

  async getTokenMetadata(tokenAddress: string) {
    try {
      const tokenPublicKey = new PublicKey(tokenAddress);
      const mintInfo = await this.connection.getParsedAccountInfo(tokenPublicKey);
      
      const parsedData = (mintInfo.value?.data as ParsedAccountData)?.parsed;
      
      return {
        symbol: parsedData?.info?.symbol || 'UNKNOWN',
        decimals: parsedData?.info?.decimals || 9,
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      throw error;
    }
  }
}

export default new SolanaService(); 