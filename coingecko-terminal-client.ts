import axios, { type AxiosInstance, type AxiosError } from "axios";

axios.defaults.headers.common["Accept-Encoding"] = "gzip";

interface PriceChangePercentage {
  m5: string;
  h1: string;
  h6: string;
  h24: string;
}

interface Transactions {
  buys: number;
  sells: number;
  buyers: number;
  sellers: number;
}

interface VolumeUSD {
  m5: string;
  h1: string;
  h6: string;
  h24: string;
}

interface TokenData {
  id: string;
  type: string;
}

interface RelationshipData {
  data: TokenData;
}

interface PoolAttributes {
  base_token_price_usd: string;
  base_token_price_native_currency: string;
  quote_token_price_usd: string;
  quote_token_price_native_currency: string;
  base_token_price_quote_token: string;
  quote_token_price_base_token: string;
  address: string;
  name: string;
  pool_created_at: string;
  fdv_usd: string;
  market_cap_usd: string;
  price_change_percentage: PriceChangePercentage;
  transactions: {
    m5: Transactions;
    m15: Transactions;
    m30: Transactions;
    h1: Transactions;
    h24: Transactions;
  };
  volume_usd: VolumeUSD;
  reserve_in_usd: string;
}

interface PoolRelationships {
  base_token: RelationshipData;
  quote_token: RelationshipData;
  network: RelationshipData;
  dex: RelationshipData;
}

interface TokenAttributes {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  image_url: string;
  coingecko_coin_id: string;
  websites: string[];
  description: string;
  gt_score: number;
  discord_url: string;
  telegram_handle: string | null;
  twitter_handle: string;
  categories: string[];
  gt_category_ids: string[];
}

interface PoolResponse {
  data: Array<{
    id: string;
    type: string;
    attributes: PoolAttributes;
    relationships: PoolRelationships;
  }>;
}

interface GetTrendingPoolNetworksParams {
  network?: string;
  include?: string;
  page?: string;
  duration?: string;
}

interface TokenResponse {
  data: {
    id: string;
    type: string;
    attributes: TokenAttributes;
  };
}

class CoinGeckoTerminalClient {
  protected client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "https://api.geckoterminal.com/api/v2",
      headers: { accept: "application/json" },
    });
  }
}

class CoinGeckoTerminalAPI extends CoinGeckoTerminalClient {
  async getTrendingPoolsAllNetwork(
    params: Omit<GetTrendingPoolNetworksParams, "network"> = {}
  ) {
    const { page = "1", duration = "24h", include } = params;

    const queryParams = new URLSearchParams({
      page,
      duration,
    });

    if (include) queryParams.append("include", include);

    try {
      const response = await this.client.get(
        `/networks/trending_pools?${queryParams.toString()}`
      );
      return response.data as PoolResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getTrendingPoolOnNetwork(params: GetTrendingPoolNetworksParams = {}) {
    const {
      page = "1",
      duration = "24h",
      include,
      network = "solana",
    } = params;

    const queryParams = new URLSearchParams({
      page,
      duration,
      network,
    });

    if (include) queryParams.append("include", include);

    try {
      const response = await this.client.get(
        `/networks/trending_pools?${queryParams.toString()}`
      );
      return response.data as PoolResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getCoinDetailInfo(network: string, address: string) {
    try {
      const response = await this.client.get(
        `networks/${network}/tokens/${address}/info`
      );

      return response as TokenResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        throw new Error(
          `API Error: ${axiosError.response.status} - ${axiosError.response.statusText}`
        );
      } else if (axiosError.request) {
        throw new Error("No response received from the API.");
      } else {
        throw new Error(`Request Error: ${axiosError.message}`);
      }
    } else {
      throw new Error("An unknown error occurred.");
    }
  }
}

export const coinGeckoTerminalAPI = new CoinGeckoTerminalAPI();
