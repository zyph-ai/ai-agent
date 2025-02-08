import { getMetadataToken } from "./pumpfun-v3";
import { redis } from "./redis";

interface CoinAnalysis {
  address: string;
  symbol: string;
  initialMarketCap: number;
  currentMarketCap: number;
  performance: string;
  status: "PROFIT" | "STABLE" | "RUG";
  multiplier?: number;
  declinePercentage?: number;
  profitPercentage?: number;
}

export const analyzeLatestCoins = async (): Promise<CoinAnalysis[]> => {
  try {
    const latestAddresses = await redis.smembers("addressCoinsStorage");
    const analyses: CoinAnalysis[] = [];

    for (const address of latestAddresses) {
      const metadataKey = `metadata:${address}`;
      const storedMetadata = await redis.get(metadataKey);

      if (!storedMetadata) {
        console.warn(`⚠️ No stored metadata found for ${address}`);
        continue;
      }

      let metadata: any;
      try {
        metadata =
          typeof storedMetadata === "string"
            ? JSON.parse(storedMetadata)
            : storedMetadata;
      } catch (error) {
        console.error(`❌ Error parsing metadata for ${address}:`, error);
        continue;
      }

      try {
        const currentData = await getMetadataToken(address);
        const initialMarketCap = metadata.currentMarketCap || 0;
        const currentMarketCap = currentData.usd_market_cap || 0;

        if (!initialMarketCap || !currentMarketCap) {
          console.warn(`⚠️ Missing market cap data for ${address}`);
          continue;
        }

        const declinePercentage =
          ((initialMarketCap - currentMarketCap) / initialMarketCap) * 100;
        let status: "PROFIT" | "STABLE" | "RUG";
        let performance = "";
        let multiplier = 0;
        let profitPercentage = 0;

        if (currentMarketCap > initialMarketCap) {
          status = "PROFIT";
          multiplier = currentMarketCap / initialMarketCap;
          profitPercentage =
            ((currentMarketCap - initialMarketCap) / initialMarketCap) * 100;
          performance = `Profit! +${profitPercentage.toFixed(1)}%`;
        } else {
          const isHighMC = initialMarketCap >= 30_000;
          const rugThreshold = isHighMC ? 50 : 70;

          if (declinePercentage >= rugThreshold || currentMarketCap < 15_000) {
            status = "RUG";
            performance = "RUG";
          } else {
            status = "STABLE";
            performance = `-${declinePercentage.toFixed(1)}%`;
          }
        }

        analyses.push({
          address,
          symbol: currentData.symbol,
          initialMarketCap,
          currentMarketCap,
          performance,
          status,
          multiplier: status === "PROFIT" ? multiplier : undefined,
          declinePercentage:
            status !== "PROFIT" ? declinePercentage : undefined,
          profitPercentage: status === "PROFIT" ? profitPercentage : undefined,
        });
      } catch (error) {
        console.error(`❌ Error processing ${address}:`, error);
        continue;
      }
    }

    analyses.sort((a, b) => {
      const statusOrder: Record<string, number> = {
        PROFIT: 0,
        STABLE: 1,
        RUG: 2,
      };
      if (a.status !== b.status)
        return statusOrder[a.status] - statusOrder[b.status];
      if (a.status === "PROFIT" && b.status === "PROFIT")
        return (b.multiplier || 0) - (a.multiplier || 0);
      return 0;
    });

    return analyses;
  } catch (error) {
    console.error("❌ Error analyzing latest coins:", error);
    throw error;
  }
};

export const formatMarketCap = (marketCap: number): string => {
  if (marketCap >= 1_000_000) return `$${(marketCap / 1_000_000).toFixed(2)}M`;
  if (marketCap >= 1_000) return `$${(marketCap / 1_000).toFixed(2)}K`;
  return `$${marketCap.toFixed(2)}`;
};

export const displayLatestCoinsAnalysis = async () => {
  const analyses = (await analyzeLatestCoins()).filter(
    (coin) => coin.status === "PROFIT"
  );

  let output = "\n📊 Latest Coins Analysis:\n";
  output += "------------------------\n";

  analyses.forEach((coin) => {
    const statusEmoji = { PROFIT: "✅", STABLE: "📉", RUG: "❌" }[coin.status];

    const profitText =
      coin.status === "PROFIT" && coin.profitPercentage
        ? ` +${coin.profitPercentage.toFixed(1)}%`
        : "";

    const handleSymbol = `${
      coin.symbol.length > 6 ? `#${coin.symbol}` : `$${coin.symbol}`
    }`;

    output += `
     Symbol: ${handleSymbol.toUpperCase()}
     Entry Call MC: ${formatMarketCap(coin.initialMarketCap)}
     Current MC: ${formatMarketCap(coin.currentMarketCap)}
     Status: ${statusEmoji} ${coin.performance}
     ------------------------\n\n`;
  });

  output += "-------- 🔥🔥🔥🔥 --------\n";

  console.log(output + "\n");

  return { output, profits: analyses.length };
};

await displayLatestCoinsAnalysis();
