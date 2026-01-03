import type { NetworkConfig } from "../../types";

export const networks: NetworkConfig[] = [
  {
    name: "BTC Mainnet",
    symbol: "BTC",
    rpcUrl: "wss://mempool.space/api/v1/ws",
    scannerUrl: "https://btcscan.org",
    chainId: null, // non-EVM
  },
  {
    name: "Ethereum Mainnet",
    rpcUrl: "https://ethereum.publicnode.com",
    symbol: "ETH",
    scannerUrl: "https://etherscan.io",
    chainId: 1,
  },
  {
    name: "Binance Smart Chain Mainnet",
    rpcUrl: "https://bsc-dataseed1.ninicoin.io/",
    symbol: "BNB",
    scannerUrl: "https://bscscan.com",
    chainId: 56,
  },
  {
    name: "Polygon Mainnet",
    rpcUrl: "https://polygon-rpc.com/",
    symbol: "MATIC",
    scannerUrl: "https://polygonscan.com",
    chainId: 137,
  },
  {
    name: "Tron Mainnet",
    rpcUrl: "https://api.trongrid.io",
    symbol: "TRX",
    scannerUrl: "https://tronscan.org",
    chainId: null, // non-EVM, tidak menggunakan chainId standar
  },
  {
    name: "Solana Mainnet",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    symbol: "SOL",
    scannerUrl: "https://solscan.io",
    chainId: null, // non-EVM
  },
  {
    name: "Sui Mainnet",
    rpcUrl: "https://fullnode.mainnet.sui.io:443",
    symbol: "SUI",
    scannerUrl: "https://suiscan.xyz",
    chainId: null, // non-EVM
  },
  {
    name: "TON Mainnet",
    rpcUrl: "https://toncenter.com/api/v2/jsonRPC",
    symbol: "TON",
    scannerUrl: "https://tonscan.org",
    chainId: null, // non-EVM
  },
];
