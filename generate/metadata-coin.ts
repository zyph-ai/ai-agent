import { createCanvas, loadImage, registerFont } from "canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register Inter font from the same directory as this script
registerFont(path.join(__dirname, "Inter-Regular.ttf"), {
  family: "Inter-Reg",
});

registerFont(path.join(__dirname, "Inter-Medium.ttf"), {
  family: "Inter-Med",
});

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

interface GenerateImageType {
  totalLiquidityUsd: string;
  tokenLogo: string;
  tokenName: string;
  tokenSymbol: string;
  currentMarketCap: number;
  totalVolume: TradeVolume;
  currentUsdPrice: string;
  deployed: number;
  buyers: TradersCount;
  sellers: TradersCount;
}

function timeAgo(timestamp: number) {
  const now = Date.now();
  const diffMs = now - timestamp;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

function getTimeInGMTMinus5() {
  const now = new Date();

  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/New_York",
  };

  let formattedTime = new Intl.DateTimeFormat("en-US", options).format(now);

  if (formattedTime.startsWith("24")) {
    formattedTime = formattedTime.replace("24", "00");
  }

  return formattedTime;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: "currency",
    currency: "USD",
  }).format(value);
}

async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) return false;

    const contentType = response.headers.get("content-type") || "";
    return contentType.startsWith("image/");
  } catch (error) {
    console.error("Error fetching image:", error);
    return false;
  }
}

export async function generateImage(
  backgroundPath: string,
  data: GenerateImageType
) {
  const background = await loadImage(backgroundPath);
  const canvas = createCanvas(background.width, background.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(background, 0, 0, background.width, background.height);

  if (await isValidImageUrl(data.tokenLogo)) {
    const logo = await loadImage(data.tokenLogo);
    const logoSize = 80;
    ctx.drawImage(logo, 50, 50, logoSize, logoSize);
  }

  ctx.font = "40px Inter-Med";
  ctx.fillStyle = "black";
  ctx.fillText(data.tokenName, 150, 80);

  ctx.font = "30px Inter-Reg";
  ctx.fillStyle = "gray";
  ctx.fillText(data.tokenSymbol.toUpperCase(), 150, 120);

  ctx.font = "24px Inter-Reg";
  ctx.fillStyle = "gray";
  ctx.fillText("Marketcap:", 500, 220);

  ctx.font = "29px Inter-Med";
  ctx.fillStyle = "black";
  ctx.fillText(formatNumber(data.currentMarketCap), 500, 260);

  ctx.font = "24px Inter-Reg";
  ctx.fillStyle = "gray";
  ctx.fillText("Volume:", 730, 220);

  ctx.font = "29px Inter-Med";
  ctx.fillStyle = "black";
  ctx.fillText(formatNumber(data.totalVolume["24h"]), 730, 260);

  ctx.font = "24px Inter-Reg";
  ctx.fillStyle = "gray";
  ctx.fillText("Liquidity:", 950, 220);

  ctx.font = "29px Inter-Med";
  ctx.fillStyle = "black";
  ctx.fillText(formatNumber(Number(data.totalLiquidityUsd)), 950, 260);

  ctx.font = "24px Inter-Reg";
  ctx.fillStyle = "gray";
  ctx.fillText("Price:", 500, 360);

  ctx.font = "29px Inter-Med";
  ctx.fillStyle = "black";
  ctx.fillText("$" + data.currentUsdPrice, 500, 400);

  ctx.font = "24px Inter-Reg";
  ctx.fillStyle = "gray";
  ctx.fillText("Deployed:", 730, 360);

  ctx.font = "29px Inter-Med";
  ctx.fillStyle = "black";
  ctx.fillText(timeAgo(data.deployed), 730, 400);

  ctx.font = "24px Inter-Reg";
  ctx.fillStyle = "gray";
  ctx.fillText("Signal:", 950, 360);

  ctx.font = "29px Inter-Med";
  ctx.fillStyle = "black";
  ctx.fillText(getTimeInGMTMinus5(), 950, 400);

  ctx.font = "24px Inter-Reg";
  ctx.fillStyle = "gray";
  ctx.fillText("Tracked Buys:", 500, 510);

  ctx.font = "29px Inter-Med";
  ctx.fillStyle = "black";
  ctx.fillText(data.buyers["24h"].toString() + " Total", 500, 550);

  ctx.font = "24px Inter-Reg";
  ctx.fillStyle = "gray";
  ctx.fillText("Tracked Sells:", 730, 510);

  ctx.font = "29px Inter-Med";
  ctx.fillStyle = "black";
  ctx.fillText(data.sellers["24h"].toString() + " Total", 730, 550);

  const outputPath = "output.png";
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}
