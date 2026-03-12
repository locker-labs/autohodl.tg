import { parseAbi, formatUnits } from "viem";
import { client, getDailyTopSavers } from "../savings.js";
import { join } from "path";
import type { DailyWinner, RewardDb } from "../types.js";
import fs from "fs/promises"; // <-- Using Node's fs/promises

const REWARDS_PATH = join(process.cwd(), "rewards.json");

const MINIMUM_CROAK_LIMIT = 1000n; // requirement
const CROAK_ADDRESS =
  "0xaCb54d07cA167934F57F829BeE2cC665e1A5ebEF" as `0x${string}`;

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
  let db: RewardDb = {};

  // Node.js way to handle file reading/existence
  try {
    const data = await fs.readFile(REWARDS_PATH, "utf-8");
    db = JSON.parse(data);
  } catch (error: any) {
    // If the file doesn't exist (ENOENT), we just proceed with the empty db object
    if (error.code !== "ENOENT") {
      console.error("Error reading rewards file:", error);
    }
  }

  const { rewardAmount = 0 } = db[userAddress] || {};
  const availableReward = MAX_REWARD - rewardAmount;

  // Calculate proportional reward
  const calculatedReward = usdcSavedFormatted * REWARD_RATE;
  const liveReward = Math.min(availableReward, calculatedReward);

  db[userAddress] = { rewardAmount: liveReward + rewardAmount };

  // Node.js file write
  await fs.writeFile(REWARDS_PATH, JSON.stringify(db, null, 2), "utf-8");

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
        // Ensure you compare with the correct decimals if needed
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
    // 1. Get raw data
    const rawSavingsData = await getDailyTopSavers();

    if (rawSavingsData.length === 0) {
      console.log("🌙 No savings found for the last 24 hours.");
      return [];
    }

    // 2. Extract addresses for the balance check
    const participantAddresses = rawSavingsData.map(
      (s: any) => s.address as `0x${string}`,
    );

    // 3. Get $CROAK holders to determine eligibility
    const eligibleAddresses = await getEligibleAddresses(participantAddresses);
    const eligibleSet = new Set(eligibleAddresses);

    // 4. Map data with the isEligible flag, sort, and grab top 5
    const results = rawSavingsData
      .map((item: any) => {
        const isEligible = eligibleSet.has(item.address as `0x${string}`);
        return {
          address: item.address,
          savedAmount: item.rawAmount, // The raw BigInt
          formattedAmount: item.formattedAmount, // The human-readable float
          rewardAmount: isEligible ? getReward(item.formattedAmount) : 0, // Only reward if eligible
        };
      })
      // Sort by the BigInt to ensure accuracy
      .sort((a: any, b: any) =>
        b.savedAmount > a.savedAmount
          ? 1
          : b.savedAmount < a.savedAmount
            ? -1
            : 0,
      )
      .slice(0, 5);

    // Ensure this function knows to ignore (or differently handle) ineligible users in the array
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

  /// 1. TODO: Implement your batched transfer logic here
  console.log(`🚀 Distributing rewards to ${transfers.length} winners...`);

  // 2. Clear the daily rewards tracking file
  try {
    // In Node.js, we just try to unlink it. If it doesn't exist, it throws ENOENT.
    await fs.unlink(REWARDS_PATH);
    console.log("✅ Rewards tracking file reset for the next day.");
  } catch (error: any) {
    // We only log an error if it failed for a reason OTHER than "file not found"
    if (error.code !== "ENOENT") {
      console.error("❌ Failed to delete rewards.json:", error);
    }
  }
};
