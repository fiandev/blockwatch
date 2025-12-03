import type { NetworkConfig, Transaction } from "../../../types";
import BaseProvider from "./BaseProvider";
import { Connection, clusterApiUrl } from "@solana/web3.js";

export class SolanaProvider extends BaseProvider {
  private connection: Connection;

  constructor(network: NetworkConfig) {
    super(network);
    this.connection = new Connection(
      network.rpcUrl || clusterApiUrl("mainnet-beta"),
    );
  }

  async getLatestBlockNumber(): Promise<number> {
    return await this.connection.getSlot();
  }

  async getLatestTransactions(): Promise<Transaction[]> {
    const slot = await this.getLatestBlockNumber();
    const block = await this.connection.getBlock(slot, {
      maxSupportedTransactionVersion: 0,
      transactionDetails: "full",
      rewards: false,
    });

    if (!block?.transactions) return [];

    return block.transactions.map((tx: any) => {
      const hash = tx.transaction.signatures[0];
      let from = "N/A";
      let to = "N/A";
      let value = "0";

      // Handle different transaction structures based on version
      if (tx.transaction.message) {
        // Modern transaction structure
        const instructions = tx.transaction.message.compiledInstructions ||
                            tx.transaction.message.instructions;

        if (instructions) {
          for (const inst of instructions) {
            if ("parsed" in inst) {
              const parsed = inst.parsed;
              if (parsed?.type === "transfer") {
                from = parsed.info.source;
                to = parsed.info.destination;
                value = parsed.info.lamports?.toString() ?? "0";
              }
            }
          }
        }
      }

      // Also check legacy structure and meta for inner instructions
      if (from === "N/A" && tx.meta?.innerInstructions) {
        for (const innerInst of tx.meta.innerInstructions || []) {
          for (const instruction of innerInst.instructions || []) {
            if ("parsed" in instruction) {
              const parsed = instruction.parsed;
              if (parsed?.type === "transfer") {
                from = parsed.info.source;
                to = parsed.info.destination;
                value = parsed.info.lamports?.toString() ?? "0";
              }
            }
          }
        }
      }

      // Try to get transfer info from pre/post token balances if not found in parsed instructions
      if (from === "N/A" && tx.meta?.preTokenBalances) {
        const transfer = tx.meta.preTokenBalances.find((balance: any) =>
          balance.uiTokenAmount &&
          parseFloat(balance.uiTokenAmount.amount) > 0 &&
          balance.owner
        );
        if (transfer) {
          from = transfer.owner;
        }
      }

      return {
        hash,
        from,
        to,
        value, // lamports
        blockNumber: slot, // pakai slot sebagai block number
      } as Transaction;
    });
  }
}
