import { getMetadataToken } from "./pumpfun-v3";
import dotenv from "dotenv";

dotenv.config();

interface TokenInfo {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenLogo: string;
  tokenDecimals: string;
  pairTokenType: string;
  liquidityUsd: number;
}

interface Pair {
  exchangeAddress: string;
  exchangeName: string;
  exchangeLogo: string;
  pairLabel: string;
  pairAddress: string;
  usdPrice: number;
  usdPrice24hrPercentChange: number;
  usdPrice24hrUsdChange: number;
  liquidityUsd: number;
  baseToken: string;
  quoteToken: string;
  pair: TokenInfo[];
}

interface PricePercentChange {
  "5min": number;
  "1h": number;
  "4h": number;
  "24h": number;
}

interface LiquidityPercentChange {
  "5min": number;
  "1h": number;
  "4h": number;
  "24h": number;
}

interface TradeVolume {
  "5min": number;
  "1h": number;
  "4h": number;
  "24h": number;
}

interface TradersCount {
  "5min": number;
  "1h": number;
  "4h": number;
  "24h": number;
}

interface GetMarketDataResponse {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenLogo: string;
  pairCreated: string;
  pairLabel: string;
  pairAddress: string;
  exchange: string;
  exchangeAddress: string;
  exchangeLogo: string;
  exchangeUrl: string;
  currentUsdPrice: string;
  currentMarketCap: number;
  currentNativePrice: string;
  totalLiquidityUsd: string;
  pricePercentChange: PricePercentChange;
  liquidityPercentChange: LiquidityPercentChange;
  buys: TradersCount;
  sells: TradersCount;
  totalVolume: TradeVolume;
  buyVolume: TradeVolume;
  sellVolume: TradeVolume;
  buyers: TradersCount;
  sellers: TradersCount;
}

export const getTokenMarketData = async (addressToken: string) => {
  try {
    console.log("✅ " + addressToken + " detected address-token");

    const dataMetadata = await getMetadataToken(addressToken);
    const pairAddress = dataMetadata.bonding_curve;

    console.log("✅ " + pairAddress + " detected pair-address");

    const response = await fetch(
      `https://solana-gateway.moralis.io/token/mainnet/pairs/${pairAddress}/stats`,
      {
        headers: {
          accept: "application/json",
          "X-API-Key": process.env.MORALIS_APIKEY as string,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = (await response.json()) as GetMarketDataResponse;
    const result = {
      ...data,
      tokenLogo: dataMetadata.image_uri,
      tokenSymbol:
        data.tokenSymbol.length > 6
          ? `#${dataMetadata?.symbol?.toUpperCase()}`
          : `$${dataMetadata?.symbol?.toUpperCase()}`,
      currentMarketCap: dataMetadata?.usd_market_cap,
      deployed: dataMetadata?.created_timestamp,
    };

    return result;
  } catch (error) {
    console.error("Error fetching pair address by token:", error);
    throw error;
  }
};
