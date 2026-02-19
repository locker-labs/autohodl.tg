import { parseAbi, formatUnits } from "viem";
import { client, getDailyTopSavers } from "../savings";

const WINNER_AMOUNT = 9999999n; // flat reward for winners
const MINIMUM_CROAK_LIMIT = 1000n; // requirement
const CROAK_ADDRESS =
  "0x176211869ca2b568f2a7d4ee941e073a821ee1ff" as `0x${string}`;

const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);

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
export const runDailyLeaderboard = async () => {
  try {
    // 1. Get raw data (now contains address, savedAmount, and formattedAmount)
    const rawSavingsData = await getDailyTopSavers();

    if (rawSavingsData.length === 0) {
      console.log("🌙 No savings found for the last 24 hours.");
      return [];
    }

    // 2. Extract addresses for the balance check
    const participantAddresses = rawSavingsData.map((s) => s.address as `0x${string}`);

    // 3. Filter for $CROAK holders
    const eligibleAddresses = await getEligibleAddresses(participantAddresses);
    const eligibleSet = new Set(eligibleAddresses);

    // 4. Filter the raw data using our eligible set
    const results = rawSavingsData
      .filter((item) => eligibleSet.has(item.address as `0x${string}`))
      .map((item) => ({
        address: item.address,
        savedAmount: item.formattedAmount, // The raw BigInt
        formattedAmount: item.formattedAmount, // The human-readable float
        rewardAmount: WINNER_AMOUNT, // Your constant reward
      }))
      // Sort by the BigInt to ensure accuracy
      .sort((a, b) => (b.savedAmount > a.savedAmount ? 1 : -1))
      .slice(0, 5);

    return results;
  } catch (error) {
    console.error("Error running daily leaderboard:", error);
    return [];
  }
};
