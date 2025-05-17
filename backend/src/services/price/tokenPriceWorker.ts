import tokenRegistryService from '../db/tokenRegistryService';
import marketCapService from './marketCapService';

class TokenPriceWorker {
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private intervalMs = 2 * 60 * 1000; // 5 minutes by default
  
  /**
   * Start the price update worker
   */
  public start(intervalMs?: number): void {
    if (this.isRunning) return;
    
    if (intervalMs) {
      this.intervalMs = intervalMs;
    }
    
    this.isRunning = true;
    this.updatePrices();
    
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, this.intervalMs);
    
    console.log(`Token price worker started with ${this.intervalMs}ms interval`);
  }
  
  /**
   * Stop the price update worker
   */
  public stop(): void {
    if (!this.isRunning) return;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.isRunning = false;
    console.log('Token price worker stopped');
  }
  
  /**
   * Update prices for all registered tokens
   */
  private async updatePrices(): Promise<void> {
    try {
      console.log('Updating token prices...');
      const tokens = await tokenRegistryService.getAllTokens();
      
      let updatedCount = 0;
      const startTime = Date.now();
      
      // Process tokens in batches to avoid rate limiting
      const batchSize = 10;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        
        // Process batch in parallel
        await Promise.all(batch.map(async (token) => {
          try {
            const price = await marketCapService.getTokenPrice(token.symbol);
            console.log("price: ", price)
            if (price) {
              await tokenRegistryService.updateTokenPrice(token.address, price);
              updatedCount++;
            }
          } catch (error) {
            console.error(`Failed to update price for ${token.symbol}:`, error);
          }
        }));
        
        // Add a small delay between batches to avoid rate limiting
        if (i + batchSize < tokens.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`Updated prices for ${updatedCount}/${tokens.length} tokens in ${duration}ms`);
    } catch (error) {
      console.error('Error in token price update worker:', error);
    }
  }
  
  /**
   * Force an immediate price update
   */
  public async forceUpdate(): Promise<void> {
    return this.updatePrices();
  }
}

export default new TokenPriceWorker(); 