export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  symbol: string;
  scannerUrl: string;
  chainId: number | null;
  amount?: number;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice?: string;
  gasLimit?: string;
  nonce?: string;
  blockNumber: number;
}

export interface Config {
  networks: NetworkConfig[];
  addresses?: string[];
  contracts?: string[];
  blockRange?: [number, number];
  telegram?: {
    botToken: string;
    channel?: string;
  };
}
