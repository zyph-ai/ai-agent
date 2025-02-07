interface TrenchBotResponse {
  bonded: boolean;
  creator_analysis: {
    current_holdings: number;
    holding_percentage: number;
    risk_level: string;
  };
  total_bundles: number;
  total_holding_amount: number;
  total_holding_percentage: number;
  total_percentage_bundled: number;
  total_sol_spent: number;
  total_tokens_bundled: number;
}

export const trenchBotAnalysisBundle = async (address: string) => {
  try {
    const response = await fetch(
      `https://trench.bot/api/bundle/bundle_advanced/${address}`
    );

    const result = (await response.json()) as TrenchBotResponse;
    return result;
  } catch (error) {
    console.error("Error fetching trade data:", error);
    throw error;
  }
};
