// providers/BtcProvider.ts
import BaseProvider from "./BaseProvider";
import type { NetworkConfig, Transaction } from "../../../types";
import WebSocket from "ws";

export default class BtcProvider extends BaseProvider {
  private ws: WebSocket;
  private txBuffer: Transaction[] = [];
  private latestBlockNumber = 0;

  constructor(network: NetworkConfig) {
    super(network);

    this.ws = new WebSocket(this.network.rpcUrl);

    this.ws.on("open", () => {
      this.ws.send(JSON.stringify({ action: "init" }));
    });

    this.ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (!msg) return;

        // BIAR TETEP SESUAI KODE LO
        this.latestBlockNumber =
          msg.blocks?.[0]?.height ?? this.latestBlockNumber;

        const transactions = msg.transactions;
        if (!Array.isArray(transactions)) return;

        for (const tx of transactions) {
          const res = await fetch(`https://mempool.space/api/tx/${tx.txid}`);
          if (!res.ok) continue;

          const detail: any = await res.json();

          // FROM: input address (ambil pertama)
          const from =
            detail.vin?.[0]?.prevout?.scriptpubkey_address ?? "coinbase";

          // TO: output pertama bukan OP_RETURN & bukan change
          let to: string | null = null;
          //   let valueSat = 0;

          const fromAddrSet = new Set(
            (detail.vin || [])
              .map((v: any) => v?.prevout?.scriptpubkey_address)
              .filter(Boolean)
          );

          for (const vout of detail.vout || []) {
            if (vout.scriptpubkey_type === "op_return") continue;
            if (!vout.scriptpubkey_address) continue;
            if (fromAddrSet.has(vout.scriptpubkey_address)) continue;

            to = vout.scriptpubkey_address;
            // valueSat += vout.value ?? 0;
          }

          this.txBuffer.push({
            hash: tx.txid,
            blockNumber: this.latestBlockNumber,
            from,
            to: to || "",
            value: tx.value.toString(),
            gasPrice: undefined,
            gasLimit: undefined,
            nonce: undefined,
          });
        }
      } catch (error) {
        console.log(error);
      }
    });
  }

  async getLatestBlockNumber(): Promise<number> {
    return this.latestBlockNumber;
  }

  async getLatestTransactions(): Promise<Transaction[]> {
    const out = [...this.txBuffer];
    this.txBuffer.length = 0;
    return out;
  }
}
