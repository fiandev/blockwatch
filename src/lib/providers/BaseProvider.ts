import type { NetworkConfig, Transaction } from "../../../types";

export default abstract class BaseProvider {
  constructor(public readonly network: NetworkConfig) {}
  abstract getLatestBlockNumber(): Promise<number>;
  abstract getLatestTransactions(): Promise<Transaction[]>;
}
