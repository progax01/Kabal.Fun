import axios from 'axios';
import envConfigs from '../../configs/envConfigs';

class MarketCapService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = envConfigs.coinmarketcapApiKey;
    this.baseUrl = 'https://pro-api.coinmarketcap.com/v2';
  }

  async getTokenPrice(symbol: string): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
        },
        params: {
          symbol: symbol,
          convert: 'USD'
        }
      });

      const price = response.data.data[symbol][0].quote.USD.price;
      return price.toString();
    } catch (error) {
      console.error('Error fetching price:', error);
      return "0";
    }
  }

  /**
   * Get detailed token market data from CoinMarketCap
   */
  async getTokenMarketData(symbol: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
        },
        params: {
          symbol: symbol,
          convert: 'USD'
        }
      });

      if (!response.data || !response.data.data || !response.data.data[symbol]) {
        return null;
      }

      const tokenData = response.data.data[symbol][0];
      const quote = tokenData.quote.USD;

      return {
        price: quote.price.toString(),
        volume24h: quote.volume_24h.toString(),
        marketCap: quote.market_cap.toString(),
        fdv: (tokenData.total_supply * quote.price).toString(),
        percentChange1h: quote.percent_change_1h.toString(),
        percentChange24h: quote.percent_change_24h.toString(),
        percentChange7d: quote.percent_change_7d.toString(),
        lastUpdated: quote.last_updated
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      return null;
    }
  }
}

export default new MarketCapService(); 