interface TokenData {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo: string;
  biggest_pool_address: string;
  open_timestamp: number;
  holder_count: number;
  circulating_supply: string;
  total_supply: string;
  max_supply: string;
  liquidity: string;
  creation_timestamp: number;
  pool: PoolData;
  dev: DevData;
  price: PriceData;
  marketcap: number;
  total_smart_wallet_in: number;
  total_whale_wallet_in: number;
}

interface PoolData {
  address: string;
  pool_address: string;
  quote_address: string;
  quote_symbol: string;
  liquidity: string;
  base_reserve: string;
  quote_reserve: string;
  initial_liquidity: string;
  initial_base_reserve: string;
  initial_quote_reserve: string;
  creation_timestamp: number;
  base_reserve_value: string;
  quote_reserve_value: string;
  quote_vault_address: string;
  base_vault_address: string;
  creator: string;
  exchange: string;
  token0_address: string;
  token1_address: string;
  base_address: string;
}

interface DevData {
  address: string;
  creator_address: string;
  creator_token_balance: string;
  creator_token_status: string;
  twitter_name_change_history: string[];
  top_10_holder_rate: string;
  dexscr_ad: number;
  dexscr_update_link: number;
  cto_flag: number;
}

interface PriceData {
  address: string;
  price: string;
  price_1m: string;
  price_5m: string;
  price_1h: string;
  price_6h: string;
  price_24h: string;
  buys_1m: number;
  buys_5m: number;
  buys_1h: number;
  buys_6h: number;
  buys_24h: number;
  sells_1m: number;
  sells_5m: number;
  sells_1h: number;
  sells_6h: number;
  sells_24h: number;
  volume_1m: string;
  volume_5m: string;
  volume_1h: string;
  volume_6h: string;
  volume_24h: string;
  buy_volume_1m: string;
  buy_volume_5m: string;
  buy_volume_1h: string;
  buy_volume_6h: string;
  buy_volume_24h: string;
  sell_volume_1m: string;
  sell_volume_5m: string;
  sell_volume_1h: string;
  sell_volume_6h: string;
  sell_volume_24h: string;
  swaps_1m: number;
  swaps_5m: number;
  swaps_1h: number;
  swaps_6h: number;
  swaps_24h: number;
  hot_level: number;
}

interface WalletInfoIndicatorData {
  data: {
    smart_wallets: number;
    whale_wallets: number;
  };
}

export const getWalletInfo = async (address: string) => {
  try {
    const response = await fetch(
      `https://gmgn.ai/api/v1/token_wallet_tags_stat/sol/${address}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching wallet info:", error);
    throw error;
  }
};

export const getMarketDataCoins = async (address: string) => {
  const response = await fetch(
    "https://gmgn.ai/api/v1/mutil_window_token_info",
    {
      method: "POST",
      body: JSON.stringify({ addresses: [address], chain: "sol" }),
      headers: { "Content-Type": "application/json" },
    }
  );

  const data = await response.json();
  const res = data && data;
  const walletInfo = await getWalletInfo(address);

  const result: TokenData = {
    ...res[0],
    marketcap: res[0]?.price?.price * res[0]?.total_supply,
    total_smart_wallet_in: walletInfo?.data?.smart_wallets,
    total_whale_wallet_in: walletInfo?.data?.whale_wallets,
  };

  return result;
};
