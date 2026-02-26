import { parseAbi, formatUnits } from "viem";
import { client, getDailyTopSavers } from "../savings";
import { join } from "path";
import type { DailyWinner, RewardDb } from "../types";
import { unlink } from "node:fs/promises";

const REWARDS_PATH = join(process.cwd(), "rewards.json");

const MINIMUM_CROAK_LIMIT = 1000n; // requirement
const CROAK_ADDRESS =
  "0x176211869ca2b568f2a7d4ee941e073a821ee1ff" as `0x${string}`;

const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);
const REWARD_RATE = 1000;
const MAX_REWARD = 1000;

export function getReward(usdcSavedFormatted: number, maxDisabled?: boolean) {
  // Calculate proportional reward
  const calculatedReward = usdcSavedFormatted * REWARD_RATE;

  if (maxDisabled) return calculatedReward;

  // Return the calculated reward, capped at the maximum limit
  return Math.min(calculatedReward, MAX_REWARD);
}

export async function getLiveReward(
  userAddress: string,
  usdcSavedFormatted: number,
) {
  const file = Bun.file(REWARDS_PATH);
  let db: RewardDb = {};

  // Load existing data
  if (await file.exists()) {
    db = await file.json();
  }
  const { rewardAmount } = db[userAddress] || {
    rewardAmount: 0,
  };
  const availableReward = MAX_REWARD - rewardAmount;
  // Calculate proportional reward
  const calculatedReward = usdcSavedFormatted * REWARD_RATE;
  const liveReward = Math.min(availableReward, calculatedReward);
  db[userAddress] = { rewardAmount: liveReward + rewardAmount };
  await Bun.write(REWARDS_PATH, JSON.stringify(db, null, 2));
  return liveReward;
}

/**
 * Filter an array of addresses based on their $CROAK balance.
 */
export const getEligibleAddresses = async (userAddresses: `0x${string}`[]) => {
  if (userAddresses.length === 0) return [];

  try {
    const balanceResults = await client.multicall({
      contracts: userAddresses.map((addr) => ({
        address: CROAK_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [addr],
      })),
    });

    return userAddresses.filter((address, index) => {
      const callResult = balanceResults[index];
      if (callResult && callResult.status === "success") {
        const balance = callResult.result as bigint;
        // Ensure you compare with the correct decimals if needed (e.g., MINIMUM_CROAK_LIMIT * 10n**18n)
        return balance >= MINIMUM_CROAK_LIMIT;
      }
      return false;
    });
  } catch (error) {
    console.error("Eligibility Check Failed:", error);
    return [];
  }
};

/**
 * Orchestrates the daily logic:
 * 1. Fetches all 24h savers
 * 2. Filters by CROAK eligibility
 * 3. Sorts by saved amount
 * 4. Returns top 5 winners
 */
export const runDailyLeaderboard = async (): Promise<DailyWinner[]> => {
  try {
    // 1. Get raw data (now contains address, savedAmount, and formattedAmount)
    const rawSavingsData = await getDailyTopSavers();

    if (rawSavingsData.length === 0) {
      console.log("🌙 No savings found for the last 24 hours.");
      return [];
    }

    // 2. Extract addresses for the balance check
    const participantAddresses = rawSavingsData.map(
      (s) => s.address as `0x${string}`,
    );

    // 3. Filter for $CROAK holders
    const eligibleAddresses = await getEligibleAddresses(participantAddresses);
    const eligibleSet = new Set(eligibleAddresses);

    // 4. Filter the raw data using our eligible set
    const results = rawSavingsData
      .filter((item) => eligibleSet.has(item.address as `0x${string}`))
      .map((item) => ({
        address: item.address,
        savedAmount: item.rawAmount, // The raw BigInt
        formattedAmount: item.formattedAmount, // The human-readable float
        rewardAmount: getReward(item.formattedAmount), // Your constant reward
      }))
      // Sort by the BigInt to ensure accuracy
      .sort((a, b) => (b.savedAmount > a.savedAmount ? 1 : -1))
      .slice(0, 5);
    await ditributeCroakReward(results);
    return results;
  } catch (error) {
    console.error("Error running daily leaderboard:", error);
    return [];
  }
};

export const ditributeCroakReward = async (winners: DailyWinner[]) => {
  const transfers: { amount: number; address: string }[] = [];
  for (const winner of winners) {
    const amount = getReward(winner.formattedAmount);
    const address = winner.address;
    transfers.push({ amount, address });
  }
  /// 1. TODO: Implement your batched transfer logic here (e.g., using viem's multicall or a distributor contract)
  console.log(`🚀 Distributing rewards to ${transfers.length} winners...`);

  // 2. Clear the daily rewards tracking file
  try {
    const file = Bun.file(REWARDS_PATH);
    if (await file.exists()) {
      await unlink(REWARDS_PATH);
      console.log("✅ Rewards tracking file reset for the next day.");
    }
  } catch (error) {
    console.error("❌ Failed to delete rewards.json:", error);
  }
};;