import "dotenv/config";
import fs from "fs";
import { networks as networkConfig } from "./includes/network-config";
import inquirer from "inquirer";
import type { NetworkConfig } from "../types";
import { BlockWatch } from "./lib/BlockWatch";
import EvmProvider from "./lib/providers/Evm";
import { TronProvider } from "./lib/providers/TRC20";
import { SolanaProvider } from "./lib/providers/Solana";
import { SuiProvider } from "./lib/providers/SUI";
import TonProvider from "./lib/providers/TON";

async function getConfig() {
  let config: NetworkConfig | Record<string, any> = {};

  // Pilih network
  const { networks } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "networks",
      message: "Pilih jaringan blockchain:",
      choices: networkConfig.map((n) => n.name).concat("Skip"),
    },
  ]);

  if (networks !== "Skip") {
    config.networks = networkConfig.filter((n) => networks.includes(n.name));
  }

  // Amount filter
  const { amountChoice } = await inquirer.prompt([
    {
      type: "list",
      name: "amountChoice",
      message: "Pilih amount (opsional):",
      choices: ["1", "10", "50", "100", "1000", "Custom", "Skip"],
    },
  ]);
  if (amountChoice !== "Skip") {
    if (amountChoice === "Custom") {
      const { customAmount } = await inquirer.prompt([
        {
          type: "input",
          name: "customAmount",
          message: "Masukkan amount custom:",
          validate: (v: any) =>
            (!isNaN(v) && Number(v) > 0) || "Harus angka positif",
        },
      ]);
      config.amount = Number(customAmount);
    } else {
      config.amount = Number(amountChoice);
    }
  }

  // Addresses filter
  const addresses = [];
  let addMoreAddress = true;
  while (addMoreAddress) {
    const { address } = await inquirer.prompt([
      {
        type: "input",
        name: "address",
        message: "Masukkan address (kosongkan untuk skip):",
      },
    ]);
    if (address) {
      addresses.push(address);
      const { more } = await inquirer.prompt([
        {
          type: "confirm",
          name: "more",
          message: "Tambah address lain?",
          default: false,
        },
      ]);
      addMoreAddress = more;
    } else {
      addMoreAddress = false;
    }
  }
  if (addresses.length > 0) config.addresses = addresses;

  // Contract filter
  const contracts = [];
  let addMoreContract = true;
  while (addMoreContract) {
    const { contract } = await inquirer.prompt([
      {
        type: "input",
        name: "contract",
        message: "Masukkan contract address (kosongkan untuk skip):",
      },
    ]);
    if (contract) {
      contracts.push(contract);
      const { more } = await inquirer.prompt([
        {
          type: "confirm",
          name: "more",
          message: "Tambah contract lain?",
          default: false,
        },
      ]);
      addMoreContract = more;
    } else {
      addMoreContract = false;
    }
  }
  if (contracts.length > 0) config.contracts = contracts;

  // Block range filter (opsional tambahan)
  const { blockRange } = await inquirer.prompt([
    {
      type: "confirm",
      name: "blockRange",
      message: "Mau pakai filter block range?",
      default: false,
    },
  ]);
  if (blockRange) {
    const { fromBlock, toBlock } = await inquirer.prompt([
      {
        type: "input",
        name: "fromBlock",
        message: "From block:",
        validate: (v: any) =>
          (!isNaN(v) && Number(v) >= 0) || "Harus angka >= 0",
      },
      {
        type: "input",
        name: "toBlock",
        message: "To block:",
        validate: (v: any) =>
          (!isNaN(v) && Number(v) >= 0) || "Harus angka >= 0",
      },
    ]);
    config.blockRange = {
      from: Number(fromBlock),
      to: Number(toBlock),
    };
  }

  return config;
}

async function main() {
  let config = fs.existsSync("config.json")
    ? JSON.parse(fs.readFileSync("config.json", "utf8"))
    : {};

  if (Object.keys(config).length === 0) {
    config = await getConfig();
    fs.writeFileSync("config.json", JSON.stringify(config, null, 2));
  }

  const blockWatch = new BlockWatch(config);

  for (let network of config.networks) {
    try {
      switch (network.name) {
        case "Ethereum Mainnet":
        case "Binance Smart Chain Mainnet":
        case "Polygon Mainnet": {
          const evmProvider = new EvmProvider(network);
          blockWatch.watch(evmProvider);
          break;
        }
        case "Tron Mainnet": {
          // const tronProvider = new TronProvider(network);
          // blockWatch.watch(tronProvider);
          break;
        }
        case "Solana Mainnet": {
          const solanaProvider = new SolanaProvider(network);
          blockWatch.watch(solanaProvider);
          break;
        }
        case "Sui Mainnet": {
          const suiProvider = new SuiProvider(network);
          blockWatch.watch(suiProvider);
          break;
        }
        case "TON Mainnet": {
          // const tonProvider = new TonProvider(network);
          // blockWatch.watch(tonProvider);
          break;
        }
        default:
          console.warn(`No provider implemented for network: ${network.name}`);
      }
    } catch (e) {
      console.log(`[${network.name}]: Error!`, e);
    }
  }
}

// main().catch((error) => {
//   console.error(error);
//   // process.exit(1);
// });

main();
