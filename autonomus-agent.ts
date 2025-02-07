import { analyzeSolanaCoin, promptToSystem } from "./analyze-market";
import {
  DeepseekAI,
  type DeepseekChatCompletionMessageParam,
} from "./deepseek-client";
import { TwitterApi } from "twitter-api-v2";
import { displayLatestCoinsAnalysis } from "./reanalyze-call";
import dotenv from "dotenv";
import fs from "fs";
import { redis } from "./redis";

dotenv.config();

console.log("\n===== AI Agent is Running =====\n");

const otherConfig = {
  temperature: 0.3,
  top_p: 0.8,
  max_tokens: 500,
};

const zyphAIAgent = new DeepseekAI({
  model: "NousResearch/Hermes-3-Llama-3.1-405B",
  ...otherConfig,
});

const maxPostsPerDay = 100;
const maxPosts = 4;
const intervalMinutes = 5;
const retryAfterMinutes = 30;
let count = 0;

const getPostCount = async () => {
  const storedCoins = await redis.smembers("addressCoinsStorage");
  return storedCoins.length;
};

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

const postToTwitter = async (content: string) => {
  const postCount = await getPostCount();
  try {
    const imageBuffer = fs.readFileSync("output.png");
    const mediaId = await twitterClient.v1.uploadMedia(imageBuffer, {
      mimeType: "image/png",
    });

    console.log("Image uploaded to Twitter, media ID:", mediaId);
    await twitterClient.v2.tweet(content, {
      media: { media_ids: [mediaId] },
    });

    console.log(
      `✅ Tweet posted successfully. Total posts today: ${
        postCount + 1
      }. Wait for ${intervalMinutes} minutes for the next post.`
    );

    count++;
    console.log(`📢 Current count in 30-minute window: ${count}`);
  } catch (error) {
    console.error("❌ Failed to post tweet:", error);
  }
};

const runAnalysisAndPost = async () => {
  const postCount = await getPostCount();

  if (postCount >= maxPostsPerDay) {
    console.log("🚫 Max daily posts reached. Stopping execution.");
    process.exit(0);
  }

  console.log(`⏳ Running market analysis... (Post ${postCount + 1})`);
  const analysisResult = await analyzeSolanaCoin();

  if (typeof analysisResult === "string") {
    const messages: DeepseekChatCompletionMessageParam[] = [
      { role: "system", content: promptToSystem },
      { role: "user", content: analysisResult },
    ];

    try {
      const aiResponse = await zyphAIAgent.generateChatCompletionsDeepseek(
        messages
      );

      if (aiResponse) await postToTwitter(aiResponse);
    } catch (error) {
      console.error("❌ AI generation error:", error);
    }
  }
};

const executeAnalysisDuringWait = async () => {
  console.log("⏳ Waiting 5 minutes before executing latest coins analysis...");
  await new Promise((resolve) => setTimeout(resolve, 15 * 60 * 1000));

  try {
    console.log("🔍 Running latest coins analysis...");
    const analysisCall = await displayLatestCoinsAnalysis();

    if (analysisCall.profits >= 1) {
      await twitterClient.v2.tweet(analysisCall.output);
      console.log("✅ Analysis tweet posted successfully");
    }
  } catch (error) {
    console.error("❌ Failed to post analysis tweet:", error);
  }
};

const startScheduler = async () => {
  console.log(`⏳ Scheduler started: Running every ${intervalMinutes} minutes`);
  runAnalysisAndPost();

  const intervalId = setInterval(async () => {
    if (count >= maxPosts) {
      console.log(
        `✅ Max tweets reached (${maxPosts}) in 30 minutes. Pausing for ${retryAfterMinutes} minutes...`
      );
      count = 0;
      clearInterval(intervalId);

      executeAnalysisDuringWait();
      setTimeout(startScheduler, retryAfterMinutes * 60 * 1000);
      return;
    }

    runAnalysisAndPost();
  }, intervalMinutes * 60 * 1000);
};

startScheduler();
