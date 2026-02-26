export type SavingTrigger = {
    userAddress: `0x${string}`;
    amount: number;
    chainId?: string;
}

export type DailyWinner = {
  address: string;
  savedAmount: bigint;
  formattedAmount: number;
  rewardAmount: number;
};

export type RewardDb = Record<string, RewardEntry>;

interface RewardEntry {
  rewardAmount: number;
}