import { Telegraf, Markup } from "telegraf";
import axios from "axios";
import { getChatPersonalization } from "./utils/personalisation";
import cron from "node-cron";
import { dailyCroakWinnerMessage } from "./utils/dailyMessages";

const token = process.env.BOT_TOKEN;
const BASE_API_URL = process.env.AUTOHODL_URL;

if (!token || !BASE_API_URL) {
  throw new Error("BOT_TOKEN is missing in environment variables!");
}
// Linea
const USDC_ADDRESS = "0x176211869cA2b568f2A7D4EE941E073a821EE1ff";

const bot = new Telegraf(token);

const CLEAN_BASE_URL = BASE_API_URL.endsWith("/")
  ? BASE_API_URL.slice(0, -1)
  : BASE_API_URL;
const CALCULATOR_ENDPOINT = `${CLEAN_BASE_URL}/api/v1/savings-calculator`;

const formatCurrency = (value: number) => {
  return (value / 1_000_000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// --- Scheduling ---

// Runs every day at 09:00 AM
cron.schedule("58 20 * * *", async () => {
  console.log("⏰ Triggering scheduled daily leaderboard...");
  const TARGET_CHAT_ID = -4788466319;
  const message = await dailyCroakWinnerMessage();
  if (!message) {
    console.log("Error while constructing daily croak winner message");
    return;
  }
  await bot.telegram.sendMessage(TARGET_CHAT_ID, message, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [
        Markup.button.url(
          "Check Your Rank",
          "https://www.autohodl.money/leaderboard",
        ),
      ],
    ]),
  });
});

// --- Commands ---

bot.command("calc", async (ctx) => {
    const walletAddress = ctx.payload.trim();
    const { id: chatId, type: chatType } = ctx.chat;
    const chatTitle = "title" in ctx.chat ? ctx.chat.title : "Private";
    const ui = getChatPersonalization(chatType, chatTitle, chatId);

  if (!walletAddress) {
    return ctx.reply("⚠️ Usage: <b>/calc &lt;wallet_address&gt;</b>", {
      parse_mode: "HTML",
    });
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return ctx.reply("❌ <b>Invalid Ethereum address format.</b>", {
      parse_mode: "HTML",
    });
  }

  const statusMsg = await ctx.reply(
    `⏳ Calculating USDC savings for <code>${walletAddress.slice(0, 6)}...</code>`,
    { parse_mode: "HTML" },
  );

  try {
    // Perform POST request with the required body
    const response = await axios.post(CALCULATOR_ENDPOINT, {
      userAddress: walletAddress,
      tokens: [USDC_ADDRESS],
    });

    // Navigate the response: savings -> USDC_ADDRESS -> [1, 10, 100]
    const savingsArray = response.data.savings[USDC_ADDRESS];

    if (!savingsArray || savingsArray.length < 3) {
      throw new Error("Invalid API response structure");
    }

    // ToDo: Convert into croaks
    const one = formatCurrency(savingsArray[0]);
    const ten = formatCurrency(savingsArray[1]);
    const hundred = formatCurrency(savingsArray[2]);
    const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

    const cardMessage = [
      ui.header,
      `<b>Wallet:</b> <code>${shortAddress}</code>`,
      `\n<code>--------------------------</code>`,
      `💰 <b>Roundup Tiers (30 Days)</b>`,
      `\n<code>$1   Tier:</code>  <b>$${one}</b>`,
      `<code>$10  Tier:</code>  <b>$${ten}</b>`,
      `<code>$100 Tier:</code>  <b>$${hundred}</b>`,
      `<code>--------------------------</code>`,
      `\n${ui.footer}`,
    ].join("\n");

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      undefined,
      cardMessage,
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.url(ui.buttonText, "https://www.autohodl.money/")],
        ]),
      },
    );
  } catch (error) {
    console.error("API Error:", error);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      undefined,
      "❌ <b>Error:</b> Could not calculate savings. Ensure the wallet has transaction history.",
      { parse_mode: "HTML" },
    );
  }
});

console.log("🚀 Bot is running with Bun (Mock Data Mode)");
bot.launch();

process.on("SIGINT", () => bot.stop("SIGINT"));
process.on("SIGTERM", () => bot.stop("SIGTERM"));
