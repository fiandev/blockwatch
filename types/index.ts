export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number | null;
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
  amount: number;
  addresses?: string[];
  contracts?: string[];
  blockRange?: [number, number];
}
