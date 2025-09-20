import type { NetworkConfig, Transaction } from "../../../types";
import BaseProvider from "./BaseProvider";
import { SuiClient } from "@mysten/sui.js/client";

export class SuiProvider extends BaseProvider {
  private client: SuiClient;

  constructor(network: NetworkConfig) {
    super(network);
    this.client = new SuiClient({ url: network.rpcUrl });
  }

  async getLatestBlockNumber(): Promise<number> {
    const checkpoint = await this.client.getLatestCheckpointSequenceNumber();
    return Number(checkpoint);
  }

  async getLatestTransactions(): Promise<Transaction[]> {
    const { data } = await this.client.queryTransactionBlocks({
      order: "descending",
      limit: 10,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
      },
    });

    if (!data) return [];

    return data.map((tx: any) => {
      let from = "N/A";
      let to = "N/A";
      let value = "0";

      // ambil sender
      if (tx.transaction?.data?.sender) {
        from = tx.transaction.data.sender;
      }

      // cek event transfer
      const transferEvent = tx.events?.find((e: any) =>
        e.type.includes("transfer::TransferEvent"),
      );
      if (transferEvent) {
        to = transferEvent.parsedJson?.recipient ?? "N/A";
        value = transferEvent.parsedJson?.amount?.toString() ?? "0";
      }

      return {
        hash: tx.digest,
        from,
        to,
        value,
        blockNumber: tx.blockHeight,
        gasPrice: tx.effects?.gasUsed?.computationCost?.toString(),
      } as Transaction;
    });
  }
}
