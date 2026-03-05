import {
  getReward,
  getEligibleAddresses,
  getLiveReward,
} from "./tokens/croak.js";
interface Personalization {
  header: string;
  body: string;
  footer: string;
  buttonText: string;
}
export const divider = `<code>${"-".repeat(22)}</code>`;

const formatUSDC = (value: number) => {
  return (value / 1_000_000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formats a number with commas and 2 decimal places.
 * Example: 4000 -> "4,000.00"
 */
export const formatAmount = (value: number): string => {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const getPastSavingsMessage = (
  chatType: string,
  chatTitle: string,
  chatId: number,
  savingsAmount: number,
  userAddress: string,
): Personalization => {
  const shortAddress = `${userAddress.slice(0, 5)}...${userAddress.slice(-3)}`;
  const body = [
    `<b>Wallet:</b> <code>${shortAddress}</code>\n`,
    `${divider}`,
    `💰 <b>Roundup Tiers (30 Days)</b>`,
    `\n<code>$1   Tier:</code>  <b>$${formatAmount(savingsAmount)}</b>`,
    `${divider}`,
  ].join("\n");
  // 1. Logic for Private Chats (Direct Messages)
  if (chatType === "private" && false) {
    return {
      header: "👤 <b>Your Personal Savings Report</b>",
      body,
      footer: "<i>Start HODLing with better yield today.</i>",
      buttonText: "🚀 Start Saving Now",
    };
  }
  if (chatType === "group" || true) {
    // if (chatId === -4788466319 || chatTitle === "Locker Team") {
    //   return {
    //     header: "🔐 <b>Locker Team Internal Analytics</b>",
    //     body,
    //     footer: "<i>Confidential - AutoHODL Yield Engine</i>",
    //     buttonText: "📊 View Internal Dashboard",
    //   };
    // }
    if (
      chatTitle.toLowerCase().includes("croak") ||
      chatTitle.toLowerCase().includes("croaker") ||
      true
    ) {
      const formattedUSDC = formatAmount(Number(formatUSDC(savingsAmount)));
      let header = `🐸 <b>$CROAK Savings Potential</b>\n`;
      header += `${divider}\n`;
      let croakBody = `User: ${shortAddress}\n`;
      croakBody += `In the last 30 days you could have saved:\n\n`;
      croakBody += `🤑 Upto ${formatAmount(getReward(parseFloat(formattedUSDC), true))} $CROAK in bonuses \n`;
      croakBody += `💵 ${formatAmount(Number(formattedUSDC))} USDC accrued savings \n`;
      croakBody += `📈 Earning yield on Aave\n`;
      let footer = `${divider}\n\n`;
      footer += `💎 Start saving: https://autohodl.money \n\n`;
      footer += `${divider}\n\n`;
      footer += `🏦 autoHODL rounds up your spending and deposits spare change into Aave.\n`;
      footer +=
        "🐸 Hold 1,000+ $CROAK to earn up to 1,000 $CROAK bonus every time you save.";
      return {
        header,
        body: croakBody,
        footer,
        buttonText: "🚀 Leap to AutoHODL",
      };
    }
  }

  return {
    header: `📊 <b>${chatTitle} Savings Estimate</b>`,
    body,
    footer: "<i>Yield-optimized via AAVE & SYT</i>",
    buttonText: "🚀 Get Started",
  };
};

export const getSavingsMessage = async (
  userAddress: `0x${string}`,
  amount: number,
): Promise<Personalization> => {
  const eligible = await getEligibleAddresses([userAddress]);
  let header = "🐸<b> A CROAKSTER saved! </b>🐸\n";
  header += `${divider}\n`;
  const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
  let body = `Address: ${shortAddress} \n`;
  body += `🏦 Rounded up $${formatAmount(amount)} into savings \n`;
  body += "📈 Earning yield on Aave \n";

  if (eligible.length == 0) {
    body += "🐸 Hold at least 1,000 $CROAK \n to earn a bonus next time \n\n";
  } else {
    const reward = await getLiveReward(userAddress, amount);
    if (reward > 0) {
      body += `🐸 Earned $${formatAmount(reward)} $CROAK bonus\n`;
    } else {
      body += `🐸 Daily limit reached for $CROAK bonus \n`;
    }
  }
  body += `${divider}\n`;
  let footer = `💎 Check your savings potential:\n`;
  footer += `/autohodl WALLET_ADDRESS`;
  return {
    header,
    body,
    footer,
    buttonText: "🚀 View savings.",
  };
};
