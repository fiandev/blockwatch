import { ethers } from "ethers";
import type BaseProvider from "./providers/BaseProvider";
import type { Config, NetworkConfig, Transaction } from "../../types";
import { TelegramService } from "./services/TelegramService";
import NodeCache from "node-cache";

const nodeCache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

export class BlockWatch {
  private config: Config;
  private telegramService?: TelegramService;

  constructor(config: Config) {
    this.config = config;

    // Initialize Telegram service if configured
    if (process.env.TELEGRAM_BOT_TOKEN) {
      this.telegramService = new TelegramService({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        channel: this.config?.telegram?.channel || 'crypto'
      });
    }
  }

  /**
   * Start watching new blocks & check transactions in a continuous loop
   */
  async watch(provider: BaseProvider) {
    const startTime = new Date().toLocaleTimeString();
    console.log(`🚀 [${startTime}] Starting network monitoring: ${provider.network.name} (${provider.network.symbol})`);

    // Run continuously
    while (true) {
      try {
        const transactions = await provider.getLatestTransactions();

        if (!transactions || transactions.length === 0) {
          await this.delay(2000); // Wait 2 seconds
          continue;
        }

        console.log(`📡 Found ${transactions.length} new transactions on ${provider.network.symbol}. Processing...`);

        let matchedCount = 0;
        for (const tx of transactions) {
          if (this.matchFilters(tx, provider.network)) {
            // Enhanced log when the filter matches
            console.log(`🚨 [MATCH] Large transaction detected on ${provider.network.symbol} | Hash: ${tx.hash.substring(0, 10)}... | Amount: ${tx.value}`);
            await this.execute(tx, provider.network);
            matchedCount++;
          }
        }

        if (matchedCount > 0) {
          console.log(`✅ Finished processing. ${matchedCount} significant transactions executed.`);
        }

        // Wait a bit before checking for new transactions again
        await this.delay(2000); // Wait 2 seconds
      } catch (error) {
        const errorTime = new Date().toLocaleTimeString();
        // Prominent error log
        console.error(`❌❌ [${errorTime}] CRITICAL! Error on ${provider.network.name} network:`, error);
        await this.delay(5000); // Wait 5 seconds on error
      }
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cek apakah transaksi sesuai dengan filter
   */
  matchFilters(tx: Transaction, network: NetworkConfig) {
    const { addresses, contracts, blockRange } = this.config;

    // Filter block range
    if (blockRange) {
      let [rangeFrom, rangeTo] = blockRange;

      if (tx.blockNumber < rangeFrom || tx.blockNumber > rangeTo) {
        return false;
      }
    }

    // Filter amount (dalam ETH/BNB/MATIC dll, normalisasi ke ether)
    if (network.amount !== undefined && network.amount !== null) {
      const value = parseFloat(ethers.formatEther(tx.value));
      if (value < network.amount) return false;
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
  async execute(tx: Transaction, network: NetworkConfig) {
    console.log("🚀 Match transaction found!");
    console.log({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value),
      blockNumber: tx.blockNumber,
    });

    // Send Telegram alert if configured
    if (this.telegramService) {
      const message = await this.formatTelegramMessage(tx, network);
      await this.telegramService.sendMessage(message);
    }
  }

  async getAssetPrice(symbol: string) {
    const cacheKey = `price_${symbol}`;
    const cachedPrice: number | undefined = nodeCache.get(cacheKey);

    if (cachedPrice) {
      return cachedPrice;
    }

    // Map symbol to CoinGecko ID
    const symbolToCoinGeckoId: Record<string, string> = {
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'POL': 'polygon-ecosystem-token',
      'MATIC': 'polygon-ecosystem-token', // MATIC is the old symbol for POL
      'TRON': 'tron',
      'SOL': 'solana',
      'SUI': 'sui',
      'TON': 'the-open-network',
      'BTC': 'bitcoin',
      'WBTC': 'wrapped-bitcoin',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'DAI': 'dai'
    };

    const coinGeckoId = symbolToCoinGeckoId[symbol] || symbol.toLowerCase();
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`);
    const data: any = await response.json();

    if (!data[coinGeckoId] || !data[coinGeckoId].usd) {
      console.warn(`Could not fetch price for symbol: ${symbol} (CoinGecko ID: ${coinGeckoId})`);
      return 0; // Return 0 if price is not available
    }

    const price = Number(data[coinGeckoId].usd);
    nodeCache.set(cacheKey, price);

    return price;
  }

  private async formatTelegramMessage(tx: Transaction, network: NetworkConfig): Promise<string> {
    const value = parseFloat(ethers.formatEther(tx.value));
    const price = await this.getAssetPrice(network.symbol);
    const amountUsd = value * price;

    return `🚨 <b>Big Transaction Alert!</b>

<b>Network:</b> ${network.name}
<b>Value:</b> ${Number(value.toFixed(3)).toLocaleString()} ${network.symbol} (${Number(amountUsd.toFixed(3)).toLocaleString()} USD)

<b>From:</b> <a href="${network.scannerUrl}/address/${tx.from}">${tx.from}</a>
<b>To:</b> <a href="${network.scannerUrl}/address/${tx.to}">${tx.to}</a>

<b>TX Hash:</b> <a href="${network.scannerUrl}/tx/${tx.hash}">${tx.hash}</a>
<b>Block:</b> <a href="${network.scannerUrl}/block/${tx.blockNumber}">${tx.blockNumber}</a>`;
  }
}
