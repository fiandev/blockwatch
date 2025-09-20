// providers.ts
import { createPublicClient, http } from "viem";
import TronWeb from "tronweb";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import BaseProvider from "./BaseProvider";
import type { NetworkConfig, Transaction } from "../../../types";

export default class EvmProvider extends BaseProvider {
  private client;

  constructor(network: NetworkConfig) {
    super(network);
    this.client = createPublicClient({
      transport: http(network.rpcUrl),
      chain: {
        id: network.chainId!,
        name: network.name,
        network: network.name.toLowerCase().replace(/\s+/g, "-"),
        nativeCurrency: { name: "Native", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [network.rpcUrl] } },
      },
    });
  }

  async getLatestBlockNumber(): Promise<number> {
    return Number(await this.client.getBlockNumber());
  }

  async getLatestTransactions(): Promise<Transaction[]> {
    const blockNumber = await this.client.getBlockNumber();
    const block = await this.client.getBlock({
      blockNumber,
      includeTransactions: true,
    });
    if (!block.transactions) return [];

    return block.transactions.map((tx: any) => ({
      hash: tx.hash,
      blockNumber: Number(blockNumber),
      from: tx.from,
      to: tx.to,
      value: tx.value ? tx.value.toString() : "0",
      gasPrice: tx.gasPrice?.toString(),
      gasLimit: tx.gas?.toString(),
      nonce: tx.nonce?.toString(),
    }));
  }
}
