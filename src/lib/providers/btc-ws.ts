// lib/providers/btc-ws.ts
import WebSocket from "ws";
import type { Transaction } from "../../../types";

export class BtcWsClient {
  private ws: WebSocket;
  private txBuffer: Transaction[] = [];
  private latestBlockNumber = 0;
  private resolveNewTransactions:
    | ((transactions: Transaction[]) => void)
    | null = null;

  constructor(rpcUrl: string) {
    this.ws = new WebSocket(rpcUrl);
    this.connect();
  }

  private connect() {
    this.ws.on("open", () => {
      console.log("BTC WebSocket connection established.");
      this.ws.send(JSON.stringify({ action: "want", data: ["blocks"] }));
    });

    this.ws.on("message", async (raw: WebSocket.Data) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (!msg) return;

        if (msg.block) {
          this.latestBlockNumber = msg.block.height;
          const res = await fetch(
            `https://mempool.space/api/block/${msg.block.id}/txs`
          );
          if (res.ok) {
            const txs: any = await res.json();
            await this.processTransactions(txs);
          }
        }
      } catch (error) {
        console.error("Error processing BTC websocket message:", error);
      }
    });

    this.ws.on("error", (error: Error) => {
      console.error("BTC WebSocket error:", error);
    });

    this.ws.on("close", () => {
      console.log("BTC WebSocket connection closed. Reconnecting...");
      // Simple reconnect delay
      setTimeout(() => {
        this.ws = new WebSocket(this.ws.url);
        this.connect();
      }, 5000);
    });
  }

  private async processTransactions(transactions: any[]) {
    const newTransactions: Transaction[] = [];
    await Promise.all(
      transactions.map(async (tx: any) => {
        // Heuristik untuk menentukan pengirim dan penerima
        const from = tx.vin?.[0]?.prevout?.scriptpubkey_address ?? "coinbase";
        let to: string | null = null;
        let value = 0;

        const fromAddrSet = new Set(
          tx.vin
            .map((v: any) => v?.prevout?.scriptpubkey_address)
            .filter(Boolean)
        );

        for (const vout of tx.vout) {
          if (
            vout.scriptpubkey_type !== "op_return" &&
            vout.scriptpubkey_address &&
            !fromAddrSet.has(vout.scriptpubkey_address)
          ) {
            to = vout.scriptpubkey_address;
            value += vout.value; // Akumulasi nilai
          }
        }

        if (to) {
          newTransactions.push({
            hash: tx.txid,
            blockNumber: tx.status?.block_height ?? this.latestBlockNumber,
            from,
            to,
            value: value.toString(),
            gasPrice: undefined,
            gasLimit: undefined,
            nonce: undefined,
          });
        }
      })
    );

    if (newTransactions.length > 0) {
      this.txBuffer.push(...newTransactions);
      if (this.resolveNewTransactions) {
        this.resolveNewTransactions([...this.txBuffer]);
        this.txBuffer = [];
        this.resolveNewTransactions = null;
      }
    }
  }

  public async getLatestBlockNumber(): Promise<number> {
    return this.latestBlockNumber;
  }

  public getLatestTransactions(): Promise<Transaction[]> {
    if (this.txBuffer.length > 0) {
      const out = [...this.txBuffer];
      this.txBuffer = [];
      return Promise.resolve(out);
    }
    return new Promise((resolve) => {
      this.resolveNewTransactions = resolve;
    });
  }
}
