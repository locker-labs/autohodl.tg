import { runDailyLeaderboard } from "./tokens/croak";
import { formatUnits } from "viem";
/**
 * Formats the daily announcement message
 */
const dailyCroakWinnerMessage = async () => {
  try {
    const winners = await runDailyLeaderboard();

    if (!winners || winners.length === 0) {
      console.log("No eligible winners found for today.");
      return;
    }

    let message = `🏆 <b>TOP SAVERS OF THE DAY</b> 🏆\n`;
    message += `<i>The elite $CROAK hodlers who saved today!</i>\n`;
    message += `<code>--------------------------</code>\n\n`;

    const medals = ["🥇", "🥈", "🥉", "👤", "👤"];

    winners.forEach((winner, index) => {
      const shortAddr = `${winner.address.slice(0, 6)}...${winner.address.slice(-4)}`;
      const formattedReward = parseFloat(
        formatUnits(winner.rewardAmount, 6),
      ).toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });

      message += `${medals[index]} <code>${shortAddr}</code>\n`;
      message += `╰─ Saved: <b>${winner.savedAmount} $USDC</b>\n\n`;
      message += `╰─ Reward: <b>${formattedReward} $CROAK</b>\n\n`;
    });

    message += `<code>--------------------------</code>\n`;
    message += `🐸 <i>Must hold 1,000+ $CROAK to qualify</i>\n`;

      return message;
  } catch (error) {
    console.error("Failed to send daily leaderboard message:", error);
  }
};


export {dailyCroakWinnerMessage}