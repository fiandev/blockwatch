import type { NetworkConfig } from "../../types";

export const networks: NetworkConfig[] = [
  {
    name: "Ethereum Mainnet",
    rpcUrl: "https://ethereum.publicnode.com",
    chainId: 1,
  },
  {
    name: "Binance Smart Chain Mainnet",
    rpcUrl: "https://bsc-dataseed.binance.org/",
    chainId: 56,
  },
  {
    name: "Polygon Mainnet",
    rpcUrl: "https://polygon-rpc.com/",
    chainId: 137,
  },
  {
    name: "Tron Mainnet",
    rpcUrl: "https://api.trongrid.io",
    chainId: null, // non-EVM, tidak menggunakan chainId standar
  },
  {
    name: "Solana Mainnet",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    chainId: null, // non-EVM
  },
  {
    name: "Sui Mainnet",
    rpcUrl: "https://fullnode.mainnet.sui.io:443",
    chainId: null, // non-EVM
  },
  {
    name: "TON Mainnet",
    rpcUrl: "https://toncenter.com/api/v2/jsonRPC",
    chainId: null, // non-EVM
  },
];
