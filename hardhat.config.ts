import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "hardhat-circom";
import "hardhat-tracer";
import { getWithdrawInputs } from "./scripts/computations";
import * as dotenv from "dotenv";

dotenv.config();

task("cardinal", "Get input arguments for CardinalVault withdrawal")
  .addParam("key", "Secret key to the subvault")
  .addParam("recipient", "address of the withdrawal recipient")
  .addParam("salt", "Secret salt to create the withdrawId")
  .addFlag("reveal", "Reveal subvault secret hash")
  .setAction(async (taskArgs) => {
    const { publicSignals, solProof, jsonProof, privateKey, hash, withdrawId } =
      await getWithdrawInputs(taskArgs.key, taskArgs.recipient, taskArgs.salt);

    console.log("\n");
    console.log("\tSOLIDITY INPUT ARRAY:");
    console.log(JSON.stringify(publicSignals, null, 2));
    console.log("\tSOLIDITY PROOF:");
    console.log(JSON.stringify(solProof, null, 2));
    console.log("\tPROOF:");
    console.log(JSON.stringify(jsonProof, null, 2));
    if (taskArgs.reveal) console.log("PRIVATE HASH:\t", privateKey);
    console.log("SUBVAULT:\t", hash);
    console.log("WITHDRAW ID:\t", withdrawId);
    console.log("\n");
  });

const { MAINNET_URL, PK } = process.env;

const accounts = PK == undefined || PK.length === 0 ? [] : [ PK ];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: false,
        },
      },
    },
  },
  networks: {
    mainnet: {
      chainId: 1,
      url: MAINNET_URL || "",
      accounts,
    },
  },
  circom: {
    inputBasePath: "./circuits",
    ptau: "pot15_final.ptau",
    circuits: [{ name: "prove_pk" }],
  },
};

export default config;
