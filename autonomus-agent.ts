import { analyzeSolanaCoin, promptToSystem } from "./analyze-market";
import {
  DeepseekAI,
  type DeepseekChatCompletionMessageParam,
} from "./deepseek-client";
import { displayLatestCoinsAnalysis } from "./reanalyze-call";
import { redis } from "./redis";
import { postTweetsWithMedia } from "./twitter-scrapper";
import dotenv from "dotenv";

dotenv.config();

console.log("\n===== AI Agent is Running =====\n");

const otherConfig = {
  temperature: 0.3,
  top_p: 0.8,
  max_tokens: 500,
};

//@Learn more deepinfra with deepseek r1 https://deepinfra.com/deepseek-ai/DeepSeek-R1
const zyphAIAgent = new DeepseekAI({
  model: "NousResearch/Hermes-3-Llama-3.1-405B",
  ...otherConfig,
});

const maxPostsPerDay = 100;
const maxPosts = 5;
const intervalMinutes = 5;
const retryAfterMinutes = 35;
let count = 0;

const getPostCount = async () => {
  const storedCoins = await redis.smembers("addressCoinsStorage");
  return storedCoins.length;
};

const postToTwitter = async (content: string) => {
  const postCount = await getPostCount();
  try {
    await postTweetsWithMedia(content);

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
      // TODO: Implement post tweet analysis
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

      // executeAnalysisDuringWait();
      setTimeout(startScheduler, retryAfterMinutes * 60 * 1000);
      return;
    }

    runAnalysisAndPost();
  }, intervalMinutes * 60 * 1000);
};

startScheduler();
