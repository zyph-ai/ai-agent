import path from "path";
import { fileURLToPath } from "url";
import { getCoinFilterByVolume } from "./bitquery";
import { getTokenMarketData } from "./moralis-client";
import { trenchBotAnalysisBundle } from "./trenchbot";
import { generateImage } from "./generate/metadata-coin";
import { redis } from "./redis";

const TRESHOLD_BUNDLERS_PERCENTAGE = 50;

export const saveMetadataCoin = async (
  tokenAddress: string,
  metadata: Record<any, any>
): Promise<boolean> => {
  try {
    const metadataKey = `metadata:${tokenAddress}`;
    await redis.set(metadataKey, JSON.stringify(metadata));
    console.log(`✅ Saved metadata for token ${tokenAddress}`);
    return true;
  } catch (error) {
    console.error(`❌ Error saving metadata for ${tokenAddress}:`, error);
    return false;
  }
};

export const analyzeSolanaCoin = async (): Promise<string | void> => {
  let coinDataArray: string[] = [];
  let currentIndex = 0;

  const fetchNewData = async () => {
    console.log("🔄 Fetching new token data...");
    const coinCreatedFromPumpfun = await getCoinFilterByVolume();

    if (coinCreatedFromPumpfun.data.Solana.DEXTrades.length) {
      const newAddresses = coinCreatedFromPumpfun.data.Solana.DEXTrades.map(
        (trade) => trade?.Trade?.Buy?.Currency?.MintAddress
      );

      const checkExists = await Promise.all(
        newAddresses.map(async (address) => {
          const exists = await redis.sismember("addressCoinsStorage", address);
          return exists === 0 ? address : null;
        })
      );

      coinDataArray = checkExists.filter(Boolean) as string[];
      currentIndex = 0;
    }
  };

  await fetchNewData();

  while (currentIndex < coinDataArray.length) {
    const getCoinCA = coinDataArray[currentIndex];

    console.log(`⏳ Waiting 30 sec before analyzing ${getCoinCA}...\n`);
    await new Promise((resolve) => setTimeout(resolve, 30000));

    const bundle = await trenchBotAnalysisBundle(getCoinCA);

    if (
      bundle?.total_percentage_bundled > TRESHOLD_BUNDLERS_PERCENTAGE ||
      bundle?.creator_analysis?.risk_level === "HIGH" ||
      bundle?.creator_analysis?.holding_percentage >
        TRESHOLD_BUNDLERS_PERCENTAGE
    ) {
      console.log(
        `❗ Total holding / deployer holding percentage is too high (${bundle.total_percentage_bundled}/${bundle.creator_analysis.holding_percentage}%) and this token is very risky based on deployer history, trying next coin...\n`
      );

      console.log("Risk Level Creator: ", bundle?.creator_analysis.risk_level);

      currentIndex++;
      continue;
    }

    const dataCoin = await getTokenMarketData(getCoinCA);
    const metadata = { ...dataCoin, ...bundle };

    if (dataCoin.currentMarketCap < 20000) {
      console.log(
        `❌ Market cap too low now (${dataCoin.currentMarketCap}), trying next coin...\n`
      );
      currentIndex++;
      continue;
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const backgroundImage = path.join(
      __dirname,
      ".",
      "generate",
      "meta-bg.jpg"
    );

    await saveMetadataCoin(getCoinCA, metadata);
    await redis.sadd("addressCoinsStorage", getCoinCA);
    await generateImage(backgroundImage, metadata);
    console.log("image saved!");

    const promptToAgent = `
    Analyze the following raw market data for a cryptocurrency pool and token coin information:
    Sentiment (bearish/bullish) based on this raw data and other criteria in below (price percent change, marketcap, safety reasoning, volume(5m, 1h, 24h, etc) buys and sells, bundle deployer (coin creator), liquidity).

    Raw data:
    ${JSON.stringify(metadata)}
    `;

    return promptToAgent;
  }

  console.log("⚠️ All tokens filtered out. Fetching new data...\n");
  await new Promise((resolve) => setTimeout(resolve, 30000));
  return analyzeSolanaCoin();
};

export const promptToSystem = `
You are a DeFi analytics assistant specializing in decentralized finance (DeFi).
Provide response into plain text not using markdown format.
Format all large number like 1K, 1M, 1B for any number.
Analyze the coin for safety reasoning like you can check on bundle total holding percentage and historical deployer was rugged coin or not.
If deployer has clean history not have rugged history. Please dont put words "low rug risk" Because maybe it will rugged or not? Please make sentiment be cautious and DYOR.
Your task is to analyze and also give sentiment or give what your thoughts make it simple, clear and please give random analyze depending on your thoughts.
Please write the analysis short but clear and make sense. And write sentiment very short, clear and make sense. Dont write all too much.
Please make analysis, sentiment only with 150 character max. dont write all too much.

Like this Example: 
1. Price surged 314% in 24h. Buy volume dominates at 54%. Deployer clean, but 15.70% tokens bundled. Bullish momentum, but exercise caution on volatility. DYOR


and also follow like this format:
tokenSymbol
tokenAddress

Deployer: get from creator_analysis.holding_percentage
Bundle: get from total_percentage_bundled
`;
