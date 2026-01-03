// providers/BtcProvider.ts
import BaseProvider from "./BaseProvider";
import type { NetworkConfig, Transaction } from "../../../types";
import { BtcWsClient } from "./btc-ws";

export default class BtcProvider extends BaseProvider {
  private wsClient: BtcWsClient;

  constructor(network: NetworkConfig) {
    super(network);
    this.wsClient = new BtcWsClient(this.network.rpcUrl);
  }

  async getLatestBlockNumber(): Promise<number> {
    return this.wsClient.getLatestBlockNumber();
  }

  async getLatestTransactions(): Promise<Transaction[]> {
    return this.wsClient.getLatestTransactions();
  }
}
