interface SolanaData {
  data: { Solana: { DEXTrades: DEXTrade[] } };
}

interface DEXTrade {
  Trade: {
    Buy: {
      Currency: {
        MintAddress: string;
        Name: string;
      };
      PriceInUSD: number;
    };
  };
}

const query = `
 query {
    Solana {
    DEXTrades(
      limitBy: {count: 1, by: Trade_Buy_Currency_MintAddress}
      limit: {count: 8}
      orderBy: {descending: Block_Time}
      where: {Trade: {Buy: {PriceInUSD: {gt: 0.00002}, Currency: {MintAddress: {notIn: ["11111111111111111111111111111111"]}}}, Sell: {AmountInUSD: {gt: "10"}}, Dex: {ProtocolName: {is: "pump"}}}, Transaction: {Result: {Success: true}}}
    ) {
      Trade {
        Buy {
          Currency {
            Name
            MintAddress
          }
          PriceInUSD
        }
      }
    }
  }
}
`;

export const getCoinFilterByVolume = async () => {
  try {
    console.log("🔄 Get current token creation");

    const response = await fetch("https://streaming.bitquery.io/eap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BITQUERY_API_KEY}`,
      },
      body: JSON.stringify({ query }),
    });

    const data = (await response.json()) as SolanaData;
    return data;
  } catch (error) {
    console.error("Error fetching trade data:", error);
    throw error;
  }
};
