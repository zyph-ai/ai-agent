interface GetMetadataResponse {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  metadata_uri: string;
  twitter: string;
  telegram: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  created_timestamp: number;
  raydium_pool: string | null;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  total_supply: number;
  website: string;
  show_name: boolean;
  king_of_the_hill_timestamp: number;
  market_cap: number;
  reply_count: number;
  last_reply: number;
  nsfw: boolean;
  market_id: string | null;
  usd_market_cap: number;
}

export const getMetadataToken = async (address: string) => {
  try {
    const response = await fetch(
      `https://frontend-api-v3.pump.fun/coins/${address}?sync=true`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = (await response.json()) as GetMetadataResponse;
    return data;
  } catch (error) {
    console.error("Error fetching pair address by token:", error);
    throw error;
  }
};
