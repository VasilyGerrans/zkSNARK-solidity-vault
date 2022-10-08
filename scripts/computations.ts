// @ts-ignore
import { groth16 } from "snarkjs";
import shajs from "sha.js";
import BN from "bn.js";
import { isAddress } from "web3-utils";
import path from "path";

const circuitParentFolder = path.join(__dirname, "../circuits");

function hexToPair(hex: BN) {
  return [
    hex.and(new BN("ffffffffffffffffffffffffffffffff", "hex")).toString(10),
    hex
      .shrn(128)
      .and(new BN("ffffffffffffffffffffffffffffffff", "hex"))
      .toString(10),
  ];
}

export function getPrivateKeyAndHash(input: string) {
  const privateKey = shajs("sha256").update(input).digest("hex");
  const hash = new BN(
    shajs("sha256").update(privateKey, "hex").digest("hex"),
    "hex"
  );
  return {
    privateKey: "0x" + privateKey,
    hash: "0x" + hash.toString(16, 64),
    privateKeyPair: hexToPair(new BN(privateKey, "hex")),
    hashPair: hexToPair(hash),
  };
}

function concatStrings(args: string[]) {
  let concat = "";
  for (let i = 0; i < args.length; i++) {
    concat += args[i];
  }
  return concat;
}

function withdrawId(privateKey: string, address: string, salt: string) {
  if (isAddress(address) == false) throw new Error("Invalid address!");
  const hex = new BN(
    shajs("sha256")
      .update(
        new BN(
          concatStrings([
            new BN(shajs("sha256").update(salt).digest("hex"), "hex").toString(
              2,
              256
            ),
            new BN(address.replace("0x", ""), "hex").toString(2, 160),
            new BN(privateKey.replace("0x", ""), "hex").toString(2, 256),
          ]),
          2
        ).toString("hex"),
        "hex"
      )
      .digest("hex"),
    "hex"
  );
  const pair = hexToPair(hex);
  return { pair, bytes32: "0x" + hex.toString(16, 64) };
}

export const getWithdrawInputs = async (
  key: string,
  recipient: string,
  salt: string
) => {
  if (isAddress(recipient) == false)
    throw new Error(`${recipient} is not a valid address!`);
  const { privateKey, privateKeyPair, hash, hashPair } =
    getPrivateKeyAndHash(key);
  const { proof, publicSignals } = await groth16.fullProve(
    {
      hash: hashPair,
      hash_pk: privateKeyPair,
      address: new BN(recipient.replace("0x", ""), "hex").toString(10),
      salt: hexToPair(
        new BN(shajs("sha256").update(salt).digest("hex"), "hex")
      ),
    },
    `${circuitParentFolder}/withdraw_js/withdraw.wasm`,
    `${circuitParentFolder}/withdraw_final.zkey`
  );

  const { bytes32 } = withdrawId(privateKey, recipient, salt);

  const solProof = await groth16.exportSolidityCallData(proof, publicSignals);

  return { publicSignals, jsonProof: proof, solProof, privateKey, hash, withdrawId: bytes32 };
};
