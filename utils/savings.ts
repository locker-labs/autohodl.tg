import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";
import { linea } from "viem/chains";

const LINEA_AUTOHODL =
  "0x315648b80bB18A5521440cC406E01eFE203B231f" as `0x${string}`;
const SAVING_EVENT = parseAbiItem(
  "event SavingExecuted(address indexed user, address indexed token, uint256 value)",
);
const SAVING_EVENT_HASH =
  "0xa5eed9cab8c7a9b6492ccdbf67579366384a697ae060f17622c1fc7300e76335";
const RPC_URL = process.env.LINEA_RPC_URL || "https://rpc.linea.build";
const CHUNK_SIZE = 10000n; // Standard limit for many RPCs


const client = createPublicClient({
  chain: linea,
  transport: http(RPC_URL),
});

const getDailyTopSavers = async () => {
  try {
    const currentBlock = await client.getBlockNumber();
    const targetRange = 43200n; // ~24 hours on Linea
    const startBlock = currentBlock - targetRange;

    let allLogs = [];

    // Pagination Loop
    for (let i = startBlock; i < currentBlock; i += CHUNK_SIZE) {
      const fromBlock = i;
      const toBlock =
        i + CHUNK_SIZE > currentBlock ? currentBlock : i + CHUNK_SIZE;

      const logs = await client.getLogs({
        address: LINEA_AUTOHODL,
        event: SAVING_EVENT,
        fromBlock,
        toBlock,
      });
      allLogs.push(...logs);
    }

    // Aggregate rewards by user
    const totals = new Map<string, bigint>();
    for (const log of allLogs) {
      const { user, value } = log.args;
      if (!user || value === undefined) continue;

      const current = totals.get(user) || 0n;
      totals.set(user, current + value);
    }

    return Array.from(totals.entries())
      .map(([address, amount]) => ({
        address,
        formattedAmount: parseFloat(formatUnits(amount, 6)),
      }))
      .sort((a, b) => b.formattedAmount - a.formattedAmount);
  } catch (error) {
    console.error("Blockchain Fetch Error:", error);
    return [];
  }
};


export {getDailyTopSavers, client}