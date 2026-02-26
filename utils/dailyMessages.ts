import { runDailyLeaderboard } from "./tokens/croak";
import { divider, formatAmount } from "./personalisation";
/**
 * Formats the daily announcement message
 */
const dailyCroakWinnerMessage = async () => {
  try {
    const winners = await runDailyLeaderboard();
    let totalReward = 0;
    let totalSaved = 0;

    winners.forEach((winner, index) => {
      // const shortAddr = `${winner.address.slice(0, 6)}...${winner.address.slice(-4)}`;
      totalReward += winner.rewardAmount;
      totalSaved += winner.formattedAmount;
    });
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    let message = `🐸 <b>$CROAK Savings: ${formattedDate}</b> 🐸\n`;
    message += `${divider}\n\n`;

    message += `🤑 ${formatAmount(totalReward)} $CROAK distributed in\nbonuses \n`;
    message += `💵 ${formatAmount(totalSaved)} USDC now earning yield \n`;
    message += `📈 Earning yield on Aave \n\n`;
    message += `${divider}\n\n`;
    message += `💎 Check your savings potential:\n`;
    message += `/autohodl WALLET_ADDRESS`;

    return message;
  } catch (error) {
    console.error("Failed to send daily leaderboard message:", error);
  }
};


export {dailyCroakWinnerMessage}