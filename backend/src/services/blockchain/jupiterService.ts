import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import { BigNumber } from 'bignumber.js';
import tokenDecimalsService from '../price/tokenDecimalsService';

interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string; // Human-readable amount (e.g., "1.5" SOL)
  slippageBps?: number;
  onlyDirectRoutes?: boolean;
}

interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string; // Raw amount with decimals
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: any;
  priceImpactPct: string;
  routePlan: any[];
  contextSlot: number;
  timeTaken: number;
  routeInfo?: any;
}

interface FormattedQuoteResponse extends QuoteResponse {
  formattedOutAmount: string; // Human-readable amount
}

class JupiterService {
  private readonly apiUrl: string;
  private tokenDecimalsCache: Record<string, number> = {};
  
  constructor() {
    // Jupiter API v6
    this.apiUrl = 'https://quote-api.jup.ag/v6';
  }
  
  /**
   * Get token decimals, with caching for efficiency
   */
  private async getTokenDecimals(mintAddress: string): Promise<number> {
    if (this.tokenDecimalsCache[mintAddress]) {
      return this.tokenDecimalsCache[mintAddress];
    }
    
    const decimals = await tokenDecimalsService.getTokenDecimals(mintAddress);
    this.tokenDecimalsCache[mintAddress] = decimals;
    return decimals;
  }
  
  /**
   * Convert human-readable amount to raw amount with decimals
   */
  private async convertToRawAmount(amount: string, mintAddress: string): Promise<string> {
    const decimals = await this.getTokenDecimals(mintAddress);
    return new BigNumber(amount)
      .multipliedBy(new BigNumber(10).pow(decimals))
      .integerValue(BigNumber.ROUND_DOWN)
      .toString();
  }
  
  /**
   * Convert raw amount with decimals to human-readable amount
   */
  private async convertToHumanReadable(rawAmount: string, mintAddress: string): Promise<string> {
    const decimals = await this.getTokenDecimals(mintAddress);
    return new BigNumber(rawAmount)
      .dividedBy(new BigNumber(10).pow(decimals))
      .toString();
  }
  
  /**
   * Get a quote for swapping tokens using Jupiter
   * Handles token decimals conversion automatically
   */
  async getQuote(params: QuoteParams): Promise<FormattedQuoteResponse> {
    try {
      // Ensure the addresses are valid public keys
      new PublicKey(params.inputMint);
      new PublicKey(params.outputMint);
      
      // Default slippage to 1% if not provided
      const slippageBps = params.slippageBps || 100;
      
      // Convert input amount to raw amount with proper decimals
      const rawInputAmount = await this.convertToRawAmount(params.amount, params.inputMint);
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: rawInputAmount,
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: (params.onlyDirectRoutes || false).toString()
      });
      
      // Make request to Jupiter API
      const response = await axios.get(`${this.apiUrl}/quote?${queryParams.toString()}`);
      
      if (response.status !== 200) {
        throw new Error(`Jupiter API error: ${response.statusText}`);
      }
      
      const quoteResponse = response.data as QuoteResponse;
      
      // Convert output amount back to human-readable format
      const formattedOutAmount = await this.convertToHumanReadable(
        quoteResponse.outAmount, 
        params.outputMint
      );
      
      return {
        ...quoteResponse,
        formattedOutAmount
      };
    } catch (error: any) {
      console.error('Error getting Jupiter quote:', error);
      throw new Error(`Failed to get Jupiter quote: ${error.message}`);
    }
  }
  
  /**
   * Get supported tokens from Jupiter
   */
  async getSupportedTokens() {
    try {
      const response = await axios.get(`${this.apiUrl}/tokens`);
      
      if (response.status !== 200) {
        throw new Error(`Jupiter API error: ${response.statusText}`);
      }
      
      // Cache token decimals from the response
      const tokens = response.data.tokens || [];
      tokens.forEach((token: any) => {
        if (token.address && token.decimals !== undefined) {
          this.tokenDecimalsCache[token.address] = token.decimals;
        }
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Error getting supported tokens:', error);
      throw new Error(`Failed to get supported tokens: ${error.message}`);
    }
  }

  /**
   * Get detailed token information from Jupiter
   */
  async getTokenInfo(tokenAddress: string) {
    try {
      // First check if the token is in Jupiter's token list
      const response = await axios.get(`${this.apiUrl}/tokens`);
      
      if (response.status !== 200) {
        throw new Error(`Jupiter API error: ${response.statusText}`);
      }
      
      // Find the token in the response
      const tokens = response.data.tokens || [];
      const token = tokens.find((t: any) => 
        t.address && t.address === tokenAddress
      );
      
      if (!token) {
        return null;
      }
      
      // Since Jupiter v6 doesn't have a direct token-info endpoint,
      // we'll use the data from the tokens endpoint
      return {
        liquidity: token.liquidity?.toString() || "0",
        volume24h: token.volume24h?.toString() || "0", 
        fdv: token.fdv?.toString() || "0",
        marketCap: token.marketCap?.toString() || "0"
      };
    } catch (error) {
      console.error('Error getting token info from Jupiter:', error);
      return null;
    }
  }
}

export default new JupiterService(); 