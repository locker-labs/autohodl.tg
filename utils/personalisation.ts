interface Personalization {
  header: string;
  footer: string;
  buttonText: string;
}

export const getChatPersonalization = (
  chatType: string,
  chatTitle: string,
  chatId: number,
): Personalization => {
  // 1. Logic for Private Chats (Direct Messages)
  if (chatType === "private") {
    return {
      header: "👤 <b>Your Personal Savings Report</b>",
      footer: "<i>Start HODLing with better yield today.</i>",
      buttonText: "🚀 Start Saving Now",
    };
  }
  if (chatType === "group") {
    if (chatId === -4788466319 || chatTitle === "Locker Team") {
      return {
        header: "🔐 <b>Locker Team Internal Analytics</b>",
        footer: "<i>Confidential - AutoHODL Yield Engine</i>",
        buttonText: "📊 View Internal Dashboard",
      };
    }
    if (
      chatTitle.toLowerCase().includes("croak") ||
      chatTitle.toLowerCase().includes("croaker")
    ) {
      return {
        header: "🐸 <b>Ribbit! Croaker Savings Report</b>",
        footer: "<i>WAGMI Croakers! Stacking lily pads. 🌿</i>",
        buttonText: "🚀 Leap to AutoHODL",
      };
    }
  }
  
  return {
    header: `📊 <b>${chatTitle} Savings Estimate</b>`,
    footer: "<i>Yield-optimized via AAVE & SYT</i>",
    buttonText: "🚀 Get Started",
  };
};
