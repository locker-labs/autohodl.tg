import { Telegraf, Markup } from "telegraf";
import axios from "axios";
import {
  getPastSavingsMessage,
  getSavingsMessage,
} from "./utils/personalisation";
import cron from "node-cron";
import { dailyCroakWinnerMessage } from "./utils/dailyMessages";
import type { SavingTrigger } from "./utils/types";
import { formatUnits } from "viem";

const token = process.env.BOT_TOKEN;
const BASE_API_URL = process.env.AUTOHODL_URL;

  const TARGET_CHAT_ID = -4788466319;
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


// --- Scheduling ---

// Runs every day at 09:00 AM
cron.schedule("51 21 * * *", async () => {
  console.log("⏰ Triggering scheduled daily leaderboard...");
  const message = await dailyCroakWinnerMessage();
  if (!message) {
    console.log("Error while constructing daily croak winner message");
    return;
  }
  await bot.telegram.sendMessage(TARGET_CHAT_ID, message, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.url("🚀 Join Now!", "https://www.autohodl.money/")],
    ]),
  });
});

// --- Commands ---

bot.command("autohodl", async (ctx) => {
  console.log(ctx.chat);
  const walletAddress = ctx.payload.trim();
  const { id: chatId, type: chatType } = ctx.chat;
  const chatTitle = "title" in ctx.chat ? ctx.chat.title : "Private";

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
    const ui = getPastSavingsMessage(
      chatType,
      chatTitle,
      chatId,
      savingsArray[0],
      walletAddress,
    );

    const cardMessage = [ui.header, ui.body, ui.footer].join("\n");

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

bot.command("daily", async (ctx) => {
  const TARGET_CHAT_ID = ctx.chat.id;
  const message = await dailyCroakWinnerMessage();
  if (!message) {
    console.log("Error while constructing daily croak winner message");
    return;
  }
  await bot.telegram.sendMessage(TARGET_CHAT_ID, message, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      [Markup.button.url("🚀 Join Now!", "https://www.autohodl.money/")],
    ]),
  });
});

// Ports
Bun.serve({
  port: process.env.TRIGGER_PORT || 3000,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/notify") {
      try {
        // ToDo: Add authorisation
        const body = await req.json();
        const { userAddress, amount, chainId } = body as SavingTrigger;
        const parsedAmount = Number(formatUnits(BigInt(amount), 6));
        const ui = await getSavingsMessage(userAddress, parsedAmount);
        const savingMessage = [ui.header, ui.body, ui.footer].join("\n");

        await bot.telegram.sendMessage(TARGET_CHAT_ID, savingMessage, {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            [Markup.button.url(ui.buttonText, "https://www.autohodl.money/")],
          ]),
        });

        return Response.json({ status: "success", delivered: true });
      } catch (err) {
        console.error("Trigger Error:", err);
        return new Response("Invalid Request", { status: 400 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log("🚀 Bot is running with Bun (Mock Data Mode)");
bot.launch();

process.on("SIGINT", () => bot.stop("SIGINT"));
process.on("SIGTERM", () => bot.stop("SIGTERM"));
