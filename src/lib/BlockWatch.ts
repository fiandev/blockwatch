import { ethers } from "ethers";
import type BaseProvider from "./providers/BaseProvider";
import type { Config, Transaction } from "../../types";

export class BlockWatch {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Start watching new blocks & check transactions
   */
  async watch(provider: BaseProvider) {
    console.log(`⏳ Watching ${provider.network.name} ...`);
    const transactions = await provider.getLatestTransactions(); // true = with transactions
    if (!transactions) return;

    for (const tx of transactions) {
      if (this.matchFilters(tx)) {
        await this.execute(tx);
      }
    }
  }

  /**
   * Cek apakah transaksi sesuai dengan filter
   */
  matchFilters(tx: Transaction) {
    const { amount, addresses, contracts, blockRange } = this.config;

    // Filter block range
    if (blockRange) {
      let [rangeFrom, rangeTo] = blockRange;

      if (tx.blockNumber < rangeFrom || tx.blockNumber > rangeTo) {
        return false;
      }
    }

    // Filter amount (dalam ETH/BNB/MATIC dll, normalisasi ke ether)
    if (amount) {
      const value = parseFloat(ethers.formatEther(tx.value));
      if (value < amount) return false;
    }

    // Filter addresses (from/to)
    if (addresses && addresses.length > 0) {
      const match = addresses.some(
        (addr) =>
          addr.toLowerCase() === tx.from?.toLowerCase() ||
          addr.toLowerCase() === tx.to?.toLowerCase(),
      );
      if (!match) return false;
    }

    // Filter contracts
    if (contracts && contracts.length > 0) {
      const match = contracts.some(
        (c) => c.toLowerCase() === tx.to?.toLowerCase(),
      );
      if (!match) return false;
    }

    return true;
  }

  /**
   * Eksekusi jika transaksi sesuai filter
   */
  async execute(tx: Transaction) {
    console.log("🚀 Match transaction found!");
    console.log({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value),
      blockNumber: tx.blockNumber,
    });

    // 👉 di sini Anda bisa tambah logic custom:
    // - simpan ke DB
    // - trigger webhook
    // - eksekusi fungsi bisnis lain
  }
}
