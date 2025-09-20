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

      // cek instruksi parsed (khusus transfer SOL)
      for (const inst of tx.transaction.message.instructions) {
        if ("parsed" in inst) {
          const parsed = inst.parsed;
          if (parsed?.type === "transfer") {
            from = parsed.info.source;
            to = parsed.info.destination;
            value = parsed.info.lamports?.toString() ?? "0";
          }
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
