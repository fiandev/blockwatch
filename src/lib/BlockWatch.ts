import { ethers } from "ethers";
import type BaseProvider from "./providers/BaseProvider";
import type {
  AddressLabel,
  Config,
  NetworkConfig,
  Transaction,
} from "../../types";
import { TelegramService } from "./services/TelegramService";
import NodeCache from "node-cache";
import fs from "fs";

const nodeCache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

export class BlockWatch {
  private config: Config;
  private cachePrevMatchedTx: Set<string> = new Set();
  private telegramService?: TelegramService;
  private addressLabels: AddressLabel[];

  constructor(config: Config) {
    this.config = config;
    this.addressLabels = JSON.parse(fs.readFileSync("./labels.json", "utf-8"));

    // Initialize Telegram service if configured
    if (process.env.TELEGRAM_BOT_TOKEN) {
      this.telegramService = new TelegramService({
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        channel: this.config?.telegram?.channel || "crypto",
      });
    }
  }
  private getAddressLabel(address: string): AddressLabel | undefined {
    if (!address) return undefined;

    const addr = address.toLowerCase();

    // ===== BNB SYSTEM / VALIDATOR ADDRESSES =====
    // 0x0000000000000000000000000000000000001xxx
    if (/^0x0{36}1[0-9a-f]{3}$/.test(addr)) {
      return {
        address,
        label: "BNB Validator / System",
        chainId: 1,
        nameTag: "Validator / System",
      };
    }

    // ===== HARDCODED LABEL LIST (ARKHAM-STYLE SEED) =====
    const manual = this.addressLabels.find(
      (label) => label.address.toLowerCase() === addr
    );
    if (manual) return manual;

    return undefined;
  }

  /**
   * Start watching new blocks & check transactions in a continuous loop
   */
  async watch(provider: BaseProvider) {
    const startTime = new Date().toLocaleTimeString();
    console.log(
      `🚀 [${startTime}] Starting network monitoring: ${provider.network.name} (${provider.network.symbol})`
    );

    // Run continuously
    while (true) {
      try {
        const transactions = await provider.getLatestTransactions();

        if (!transactions || transactions.length === 0) {
          await this.delay(2000); // Wait 2 seconds
          continue;
        }

        let matchedCount = 0;

        for (const tx of transactions) {
          if (this.cachePrevMatchedTx.has(tx.hash)) continue;
          if (this.matchFilters(tx, provider.network)) {
            await this.execute(tx, provider.network);

            if (this.cachePrevMatchedTx.size >= 1000) {
              this.cachePrevMatchedTx.clear();
            }

            this.cachePrevMatchedTx.add(tx.hash);

            matchedCount++;
          }
        }

        // Wait a bit before checking for new transactions again
        await this.delay(2000); // Wait 2 seconds
      } catch (error) {
        const errorTime = new Date().toLocaleTimeString();
        // Prominent error log
        console.error(
          `❌❌ [${errorTime}] CRITICAL! Error on ${provider.network.name} network:`,
          error
        );
        await this.delay(5000); // Wait 5 seconds on error
      }
    }
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
      let value: number;
      if (network.symbol === "BTC") {
        value = parseFloat(tx.value) / 100000000; // Convert satoshis to BTC
      } else {
        value = parseFloat(ethers.formatEther(tx.value));
      }
      if (value < network.amount) return false;
    }

    // Filter addresses (from/to)
    if (addresses && addresses.length > 0) {
      const match = addresses.some(
        (addr) =>
          addr.toLowerCase() === tx.from?.toLowerCase() ||
          addr.toLowerCase() === tx.to?.toLowerCase()
      );
      if (!match) return false;
    }

    // Filter contracts
    if (contracts && contracts.length > 0) {
      const match = contracts.some(
        (c) => c.toLowerCase() === tx.to?.toLowerCase()
      );
      if (!match) return false;
    }

    return true;
  }

  /**
   * Eksekusi jika transaksi sesuai filter
   */
  async execute(tx: Transaction, network: NetworkConfig) {
    console.log(
      `[${network.symbol}] Match transaction found - ${tx.hash}`,
      this.cachePrevMatchedTx.size
    );

    let value: string | number;
    if (network.symbol === "BTC") {
      value = parseFloat(tx.value) / 100000000;
    } else {
      value = ethers.formatEther(tx.value);
    }

    // Send Telegram alert if configured
    if (this.telegramService) {
      const message = await this.formatTelegramMessage(tx, network);
      console.log(message);
      // await this.telegramService.sendMessage(message);
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
      ETH: "ethereum",
      BNB: "binancecoin",
      POL: "polygon-ecosystem-token",
      MATIC: "polygon-ecosystem-token", // MATIC is the old symbol for POL
      TRON: "tron",
      SOL: "solana",
      SUI: "sui",
      TON: "the-open-network",
      BTC: "bitcoin",
      WBTC: "wrapped-bitcoin",
      USDC: "usd-coin",
      USDT: "tether",
      DAI: "dai",
    };

    const coinGeckoId = symbolToCoinGeckoId[symbol] || symbol.toLowerCase();
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`
    );
    const data: any = await response.json();

    if (!data[coinGeckoId] || !data[coinGeckoId].usd) {
      console.warn(
        `Could not fetch price for symbol: ${symbol} (CoinGecko ID: ${coinGeckoId})`
      );
      return 0; // Return 0 if price is not available
    }

    const price = Number(data[coinGeckoId].usd);
    nodeCache.set(cacheKey, price);

    return price;
  }

  private async formatTelegramMessage(
    tx: Transaction,
    network: NetworkConfig
  ): Promise<string> {
    let value: number;
    if (network.symbol === "BTC") {
      value = parseFloat(tx.value) / 100000000;
    } else {
      value = parseFloat(ethers.formatEther(tx.value));
    }

    const price = await this.getAssetPrice(network.symbol);
    const amountUsd = value * price;

    const fromLabel = this.getAddressLabel(tx.from);
    const toLabel = this.getAddressLabel(tx.to);
    const blockExplorer = network.scannerUrl || network.arkhamUrl;

    return `🚨 <b>Big Transaction Alert!</b>

<b>Network:</b> ${network.name}
<b>Value:</b> ${Number(value.toFixed(3)).toLocaleString()} ${
      network.symbol
    } (${Number(amountUsd.toFixed(3)).toLocaleString()} USD)

<b>From:</b> <a href="${network.arkhamUrl}/address/${tx.from}">${tx.from}</a> ${
      fromLabel ? `(${fromLabel.nameTag})` : "(Unknown)"
    }
<b>To:</b> <a href="${network.arkhamUrl}/address/${tx.to}">${tx.to}</a> ${
      toLabel ? `(${toLabel.nameTag})` : "(Unknown)"
    }

<b>TX Hash:</b> <a href="${network.scannerUrl}/tx/${tx.hash}">${tx.hash}</a>
<b>Block:</b> <a href="${blockExplorer}/block/${tx.blockNumber}">${
      tx.blockNumber
    }</a>`;
  }
}
