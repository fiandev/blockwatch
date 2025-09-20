(globalThis as any).proto = {};
import { TronWeb } from "tronweb";
import BaseProvider from "./BaseProvider";
import type { NetworkConfig, Transaction } from "../../../types";

//
export class TronProvider extends BaseProvider {
  private tronWeb: TronWeb;

  constructor(network: NetworkConfig) {
    super(network);
    this.tronWeb = new TronWeb({
      fullHost: network.rpcUrl,
    });
  }

  async getLatestBlockNumber(): Promise<number> {
    const block = await this.tronWeb.trx.getCurrentBlock();
    return block.block_header.raw_data.number;
  }

  async getLatestTransactions(): Promise<Transaction[]> {
    const block = await this.tronWeb.trx.getCurrentBlock();
    if (!block.transactions) return [];

    return block.transactions.map((tx: any) => ({
      hash: tx.txID,
      from: tx.raw_data.contract[0].parameter.value.owner_address,
      to: tx.raw_data.contract[0].parameter.value.to_address,
      value: tx.raw_data.contract[0].parameter.value.amount?.toString() || "0",
      blockNumber: block.block_header.raw_data.number,
    }));
  }
}
