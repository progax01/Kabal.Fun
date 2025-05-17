import mongoose, { Document, Schema } from 'mongoose';
import marketCapService from '../price/marketCapService';
import TokenPriceHistory from "../../models/tokenPriceHistoryModel";
import BigNumber from 'bignumber.js';

// Define the token schema
interface IToken extends Document {
  address: string;
  symbol: string;
  name?: string;
  decimals: number;
  logoURI?: string;
  coingeckoId?: string;
  lastPrice?: string;
  lastUpdated?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tokenSchema = new Schema<IToken>({
  address: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  symbol: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String
  },
  decimals: {
    type: Number,
    required: true,
    default: 9
  },
  logoURI: {
    type: String
  },
  coingeckoId: {
    type: String
  },
  lastPrice: {
    type: String
  },
  lastUpdated: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Create the model
const TokenModel = mongoose.model<IToken>('Token', tokenSchema);

class TokenRegistryService {
  private static instance: TokenRegistryService;
  private tokenCache: Map<string, IToken> = new Map();
  private isInitialized = false;

  // Singleton pattern
  public static getInstance(): TokenRegistryService {
    if (!TokenRegistryService.instance) {
      TokenRegistryService.instance = new TokenRegistryService();
    }
    return TokenRegistryService.instance;
  }

  /**
   * Initialize the token registry by loading all tokens from the database
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const tokens = await TokenModel.find({ isActive: true });
      tokens.forEach(token => {
        this.tokenCache.set(token.address, token);
      });
      
      this.isInitialized = true;
      console.log(`Token registry initialized with ${tokens.length} tokens`);
    } catch (error) {
      console.error('Failed to initialize token registry:', error);
    }
  }

  /**
   * Register a new token or update an existing one
   */
  public async registerToken(
    address: string, 
    symbol: string, 
    decimals: number,
    name?: string,
    logoURI?: string,
    coingeckoId?: string
  ): Promise<IToken> {
    address = address;
    
    try {
      // Check if token exists in cache
      if (this.tokenCache.has(address)) {
        return this.tokenCache.get(address)!;
      }
      
      // Check if token exists in database
      let token = await TokenModel.findOne({ address });
      
      if (token) {
        // Update token if it exists
        token.symbol = symbol;
        token.decimals = decimals;
        if (name) token.name = name;
        if (logoURI) token.logoURI = logoURI;
        if (coingeckoId) token.coingeckoId = coingeckoId;
        token.isActive = true;
        await token.save();
      } else {
        // Create new token if it doesn't exist
        token = await TokenModel.create({
          address,
          symbol,
          decimals,
          name,
          logoURI,
          coingeckoId,
          isActive: true
        });
      }
      
      // Add to cache
      this.tokenCache.set(address, token);
      
      return token;
    } catch (error) {
      console.error(`Failed to register token ${address}:`, error);
      throw new Error(`Failed to register token: ${error}`);
    }
  }

  /**
   * Get all registered tokens
   */
  public async getAllTokens(): Promise<IToken[]> {
    try {
      return await TokenModel.find({ isActive: true });
    } catch (error) {
      console.error('Failed to get all tokens:', error);
      return [];
    }
  }

  /**
   * Get token by address
   */
  public async getTokenByAddress(address: string): Promise<IToken | null> {
    address = address;
    
    // Check cache first
    if (this.tokenCache.has(address)) {
      return this.tokenCache.get(address)!;
    }
    
    try {
      const token = await TokenModel.findOne({ address });
      if (token && token.isActive) {
        this.tokenCache.set(address, token);
        return token;
      }
      return null;
    } catch (error) {
      console.error(`Failed to get token ${address}:`, error);
      return null;
    }
  }

  /**
   * Update token price and save to history
   */
  public async updateTokenPrice(address: string, price: string): Promise<void> {
    address = address;
    
    console.log(`Updating price for ${address}: ${price}`);
    
    try {
      // Validate price is a valid number and not zero
      const priceNum = Number(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        console.error(`Invalid price for ${address}: ${price}`);
        return;
      }
      
      // Update token in registry
      await TokenModel.findOneAndUpdate(
        { address },
        { 
          lastPrice: price,
          lastUpdated: new Date()
        }
      );
      
      // Save to price history
      await TokenPriceHistory.create({
        tokenAddress: address,
        price: price,
        timestamp: new Date()
      });
      
      console.log(`Successfully saved price for ${address}: ${price}`);
      
      // Update cache
      const token = this.tokenCache.get(address);
      if (token) {
        token.lastPrice = price;
        token.lastUpdated = new Date();
        this.tokenCache.set(address, token);
      }
    } catch (error) {
      console.error(`Failed to update price for ${address}:`, error);
    }
  }

  /**
   * Get token price (from cache or fetch if needed)
   */
  public async getTokenPrice(address: string): Promise<string | null> {
    address = address;
    
    try {
      const token = await this.getTokenByAddress(address);
      if (!token) return null;
      
      // If price is recent (less than 5 minutes old), return it
      if (token.lastPrice && token.lastUpdated) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (token.lastUpdated > fiveMinutesAgo) {
          return token.lastPrice;
        }
      }
      
      // Otherwise fetch new price
      const price = await marketCapService.getTokenPrice(token.symbol);
      if (price) {
        await this.updateTokenPrice(address, price);
        return price;
      }
      
      // Return last known price if available
      return token.lastPrice || null;
    } catch (error) {
      console.error(`Failed to get token price for ${address}:`, error);
      return null;
    }
  }

  /**
   * Get historical price data
   */
  public async getTokenPriceHistory(
    address: string, 
    startDate?: Date, 
    endDate?: Date,
    limit: number = 100
  ): Promise<Array<{ price: string, timestamp: Date }>> {
    address = address;
    
    try {
      const query: any = { tokenAddress: address };
      
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
      }
      
      const priceHistory = await TokenPriceHistory.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('price timestamp -_id');
      
      return priceHistory;
    } catch (error) {
      console.error(`Failed to get price history for ${address}:`, error);
      return [];
    }
  }

  /**
   * Get price at a specific date
   */
  public async getTokenPriceAtDate(address: string, date: Date): Promise<string | null> {
    address = address;
    
    try {
      // Find the closest price entry before or at the specified date
      const priceEntry = await TokenPriceHistory.findOne({
        tokenAddress: address,
        timestamp: { $lte: date }
      })
      .sort({ timestamp: -1 })
      .select('price');
      
      return priceEntry ? priceEntry.price : null;
    } catch (error) {
      console.error(`Failed to get price at date for ${address}:`, error);
      return null;
    }
  }

  /**
   * Get price change over a period
   */
  public async getTokenPriceChange(
    address: string, 
    startDate: Date, 
    endDate: Date = new Date()
  ): Promise<{ startPrice: string | null, endPrice: string | null, changePercent: string | null }> {
    address = address;
    
    try {
      const startPrice = await this.getTokenPriceAtDate(address, startDate);
      const endPrice = await this.getTokenPriceAtDate(address, endDate);
      
      if (startPrice && endPrice) {
        const startPriceBN = new BigNumber(startPrice);
        const endPriceBN = new BigNumber(endPrice);
        
        if (startPriceBN.isGreaterThan(0)) {
          const changePercent = endPriceBN
            .minus(startPriceBN)
            .dividedBy(startPriceBN)
            .multipliedBy(100)
            .toString();
          
          return { startPrice, endPrice, changePercent };
        }
      }
      
      return { startPrice, endPrice, changePercent: null };
    } catch (error) {
      console.error(`Failed to get price change for ${address}:`, error);
      return { startPrice: null, endPrice: null, changePercent: null };
    }
  }

  /**
   * Get prices for multiple tokens at once
   */
  async getTokenPrices(tokenAddresses: string[]): Promise<Record<string, string>> {
    try {
      const result: Record<string, string> = {};
      
      // Process tokens in parallel for better performance
      await Promise.all(tokenAddresses.map(async (address) => {
        const token = await this.getTokenByAddress(address);
        if (token) {
          result[address] = token.lastPrice || '0';
        } else {
          result[address] = '0';
        }
      }));
      
      return result;
    } catch (error) {
      console.error('Error getting token prices:', error);
      return {};
    }
  }
}

export default TokenRegistryService.getInstance(); 