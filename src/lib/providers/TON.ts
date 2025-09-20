import type { NetworkConfig, Transaction } from "../../../types";
import BaseProvider from "./BaseProvider";

export default class TonProvider extends BaseProvider {
  private rpcUrl: string;

  constructor(network: NetworkConfig) {
    super(network);
    this.rpcUrl = network.rpcUrl;
  }

  /**
   * Get the latest block number (seqno) from TON RPC REST API.
   * Depending on the provider, endpoints may include:
   * - /getMasterchainInfo
   * - /getConsensusBlock
   * - /blocks
   */
  async getLatestBlockNumber(): Promise<number> {
    // Example using QuickNode or Chainstack REST endpoints
    const url = `${this.rpcUrl}/getMasterchainInfo`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch latest block info: ${resp.status}`);
    }

    const data: any = await resp.json();

    // Parse response depending on API format
    if (data.masterchain_info && data.masterchain_info.last_seqno) {
      return data.masterchain_info.last_seqno;
    }
    if (data.consensus_block) {
      return data.consensus_block;
    }

    throw new Error("Could not find seqno field in response");
  }

  /**
   * Fetch latest transactions from the most recent block
   * using the /getBlockTransactions REST endpoint.
   */
  async getLatestTransactions(): Promise<Transaction[]> {
    const seqno = await this.getLatestBlockNumber();

    // Default workchain and shard for masterchain
    const workchain = -1;
    const shard = "-9223372036854775808";

    const params = new URLSearchParams({
      workchain: workchain.toString(),
      shard: shard,
      seqno: seqno.toString(),
      count: "50", // adjust as needed
    });

    const url = `${this.rpcUrl}/getBlockTransactions?${params.toString()}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch block transactions: ${resp.status}`);
    }

    const data: any = await resp.json();
    if (!data.transactions || !Array.isArray(data.transactions)) {
      return [];
    }

    // Map raw transactions into normalized Transaction type
    return data.transactions.map((tx: any) => ({
      hash: tx.hash,
      from: tx.account || "N/A",
      blockNumber: seqno,
      to: "N/A",
      value: tx.lt ?? "0", // logical time or another field depending on API
    }));
  }
}
