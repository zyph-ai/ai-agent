import axios, { type AxiosInstance } from "axios";
import dotenv from "dotenv";

dotenv.config();

export type DeepseekChatCompletionMessageParam = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
};

export type DeepseekChatCompletionRequestConfig = {
  model: string;
  messages: Array<DeepseekChatCompletionMessageParam>;
  temperature?: number;
  logprobs?: boolean;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  top_logprobs?: number;
  max_tokens?: number;
  stream?: boolean;
};

class DeepseekClient {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: "https://api.deepinfra.com/v1/openai",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async createChatCompletion(payload: DeepseekChatCompletionRequestConfig) {
    let attempts = 0;
    const maxRetries = 5;
    const baseDelay = 2000;

    while (attempts < maxRetries) {
      try {
        const response = await this.client.post("/chat/completions", payload);
        return response.data;
      } catch (error) {
        attempts++;

        if (axios.isAxiosError(error)) {
          console.warn(
            `⚠️ Deepseek API Error (Attempt ${attempts}): ${
              error.response?.status || "Unknown"
            } - ${error.response?.data?.error?.message || "No error message"}`
          );
        } else {
          console.warn(
            `⚠️ Unknown error in Deepseek API call (Attempt ${attempts})`
          );
        }

        if (attempts >= maxRetries) {
          console.error("🚨 Maximum retries reached. Giving up.");
          return null;
        }

        // Exponential backoff before retrying
        const delay = baseDelay * Math.pow(2, attempts);
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return null;
  }
}

export class DeepseekAI {
  private client: DeepseekClient;
  private deepseekConfig: Omit<DeepseekChatCompletionRequestConfig, "messages">;

  constructor(aiConfig: Omit<DeepseekChatCompletionRequestConfig, "messages">) {
    this.client = new DeepseekClient(process.env.DEEPINFRA_APIKEY!);
    this.deepseekConfig = aiConfig;
  }

  async generateChatCompletionsDeepseek(
    messages: Array<DeepseekChatCompletionMessageParam>
  ): Promise<string | null> {
    console.log("Token found! 🤖 Agent is Thinking~~~\n");

    const response = await this.client.createChatCompletion({
      ...this.deepseekConfig,
      stream: false,
      messages,
    });

    if (!response || !response.choices?.[0]?.message?.content) {
      console.warn("❌ Failed to get a valid response from Deepseek.");
      return null;
    }

    const aiResponse = response.choices[0].message.content;
    console.log("AI Response\n", aiResponse);
    return aiResponse;
  }
}
