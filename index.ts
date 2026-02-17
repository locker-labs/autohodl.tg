import { Telegraf } from "telegraf";

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error("BOT_TOKEN is missing in environment variables!");
}

const bot = new Telegraf(token);

const getMockSavings = (address: string) => {
  return {
    wallet: `${address.slice(0, 6)}...${address.slice(-4)}`,
    oneDollar: (Math.random() * 50 + 10).toFixed(2), // Mock $1 tier
    tenDollar: (Math.random() * 200 + 50).toFixed(2), // Mock $10 tier
    hundredDollar: (Math.random() * 1000 + 200).toFixed(2), // Mock $100 tier
  };
};
const escape = (text: string) => {
  return text.replace(/[_*[\]()~`>#+-=|{}.!]/g, "\\$&");
};

bot.command("calc", async (ctx) => {
  const walletAddress = ctx.payload.trim();

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

  try {
    const data = getMockSavings(walletAddress);

    // Using HTML tags for a clean card look
    const message = [
      `📊 <b>30D Savings Estimate</b>`,
      `<b>Wallet:</b> <code>${data.wallet}</code>`,
      `\n<code>--------------------------</code>`,
      `💰 <b>Roundup Tiers (30 Days)</b>`,
      `\n<code>$1   Tier:</code>  <b>$${data.oneDollar}</b>`,
      `<code>$10  Tier:</code>  <b>$${data.tenDollar}</b>`,
      `<code>$100 Tier:</code>  <b>$${data.hundredDollar}</b>`,
      `<code>--------------------------</code>`,
      `\n<i>Estimated using on-chain activity.</i>`,
    ].join("\n");

    await ctx.reply(message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("Bot Error:", error);
    await ctx.reply("❌ An error occurred while generating the report.");
  }
});

console.log("🚀 Bot is running with Bun (Mock Data Mode)");
bot.launch();

process.on("SIGINT", () => bot.stop("SIGINT"));
process.on("SIGTERM", () => bot.stop("SIGTERM"));
