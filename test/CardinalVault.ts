import { expect } from "chai";
import { BigNumberish, BytesLike } from "ethers";
import { ethers } from "hardhat";
import {
  getWithdrawInputs,
  getPrivateKeyAndHash,
} from "../scripts/computations";
import { CardinalVault } from "../typechain-types";
import { PromiseOrValue } from "../typechain-types/common";

describe("CardinalVault", function () {
  let ownerSigner: any;
  let depositorSigner: any;
  let withdrawerSigner: any;

  let cardinalVault: CardinalVault;

  let hash: PromiseOrValue<BytesLike>;
  let withdrawId: PromiseOrValue<BytesLike>;
  let proofInput: PromiseOrValue<BigNumberish>[];

  const key = "S3CR3T1337INPUT";
  const salt = "1337";
  const salt2 = "1338";

  before(async () => {
    const signers = await ethers.getSigners();
    ownerSigner = signers[0];
    depositorSigner = signers[1];
    withdrawerSigner = signers[2];
  });

  it("Deploys contracts", async function () {
    const Verifier = await ethers.getContractFactory("Verifier");
    const verifier = await Verifier.connect(ownerSigner).deploy();

    const CardinalVault = await ethers.getContractFactory("CardinalVault");
    cardinalVault = await CardinalVault.connect(ownerSigner).deploy(
      verifier.address
    );
  });

  it("Deposits ethers to vault", async () => {
    const { hash } = getPrivateKeyAndHash(key);

    const depositAmount = ethers.utils.parseUnits("10", "ether");

    const subvaultBalanceBefore = await cardinalVault.ethSubvaults(hash);
    const cardinalBalanceBefore = await ethers.provider.getBalance(
      cardinalVault.address
    );
    const depostorBalanceBefore = await ethers.provider.getBalance(
      depositorSigner.address
    );
    const tx = await cardinalVault
      .connect(depositorSigner)
      .depositEth(hash, { value: depositAmount });

    const subvaultBalanceAfter = await cardinalVault.ethSubvaults(hash);
    const cardinalBalanceAfter = await ethers.provider.getBalance(
      cardinalVault.address
    );
    const depostorBalanceAfter = await ethers.provider.getBalance(
      depositorSigner.address
    );

    expect(subvaultBalanceAfter.sub(subvaultBalanceBefore)).to.be.eq(
      depositAmount
    );
    expect(cardinalBalanceAfter.sub(cardinalBalanceBefore)).to.be.eq(
      depositAmount
    );
    expect(
      depostorBalanceBefore.sub(depostorBalanceAfter)
    ).to.be.greaterThanOrEqual(depositAmount);

    const receipt = await tx.wait();
  });

  it("Withdraws ethers from vault", async () => {
    const res = await getWithdrawInputs(key, withdrawerSigner.address, salt);

    const solProof = res.solProof;
    hash = res.hash;
    withdrawId = res.withdrawId;

    const withdrawAmount = ethers.utils.parseUnits("1", "ether");

    proofInput = solProof.split('"').filter((e: string) => e.startsWith("0x"));

    const subvaultBalanceBefore = await cardinalVault.ethSubvaults(hash);
    const withdrawIdBefore = await cardinalVault.ethSubvaultsWithdrawIds(
      hash,
      withdrawId
    );
    const cardinalBalanceBefore = await ethers.provider.getBalance(
      cardinalVault.address
    );
    const withdrawerBalanceBefore = await ethers.provider.getBalance(
      withdrawerSigner.address
    );
    const tx = await cardinalVault.connect(withdrawerSigner).withdrawEth(
      hash,
      withdrawId,
      withdrawerSigner.address,
      withdrawAmount,
      [proofInput[0], proofInput[1]],
      [
        [proofInput[2], proofInput[3]],
        [proofInput[4], proofInput[5]],
      ],
      [proofInput[6], proofInput[7]]
    );
    const subvaultBalanceAfter = await cardinalVault.ethSubvaults(hash);
    const withdrawIdAfter = await cardinalVault.ethSubvaultsWithdrawIds(
      hash,
      withdrawId
    );
    const cardinalBalanceAfter = await ethers.provider.getBalance(
      cardinalVault.address
    );
    const withdrawerBalanceAfter = await ethers.provider.getBalance(
      withdrawerSigner.address
    );

    expect(withdrawIdBefore).to.be.false;
    expect(withdrawIdAfter).to.be.true;
    expect(subvaultBalanceBefore.sub(subvaultBalanceAfter)).to.be.eq(
      withdrawAmount
    );
    expect(cardinalBalanceAfter).to.be.eq(
      cardinalBalanceBefore.sub(withdrawAmount)
    );
    expect(withdrawerBalanceBefore).lessThan(withdrawerBalanceAfter);

    const receipt = await tx.wait();
  });

  it("Fails to reuse proof", async () => {
    const withdrawAmount = ethers.utils.parseUnits("1", "ether");

    await expect(
      cardinalVault.connect(withdrawerSigner).withdrawEth(
        hash,
        withdrawId,
        withdrawerSigner.address,
        withdrawAmount,
        [proofInput[0], proofInput[1]],
        [
          [proofInput[2], proofInput[3]],
          [proofInput[4], proofInput[5]],
        ],
        [proofInput[6], proofInput[7]]
      )
    ).to.be.revertedWith("CardinalVault: withdrawId spent");

    const res = await getWithdrawInputs(
      "I DON'T ACTUALLY KNOW THE KEY",
      withdrawerSigner.address,
      salt
    );

    withdrawId = res.withdrawId;

    await expect(
      cardinalVault.connect(withdrawerSigner).withdrawEth(
        hash,
        withdrawId,
        withdrawerSigner.address,
        withdrawAmount,
        [proofInput[0], proofInput[1]],
        [
          [proofInput[2], proofInput[3]],
          [proofInput[4], proofInput[5]],
        ],
        [proofInput[6], proofInput[7]]
      )
    ).to.be.revertedWith("CardinalVault: proof invalid");
  });

  it("Fails to withdraw without a valid proof", async () => {
    const withdrawAmount = ethers.utils.parseUnits("1", "ether");

    const res = await getWithdrawInputs(
      "I DON'T ACTUALLY KNOW THE KEY",
      withdrawerSigner.address,
      "SOME RANDOM SALT"
    );

    proofInput = res.solProof
      .split('"')
      .filter((e: string) => e.startsWith("0x"));

    await expect(
      cardinalVault.connect(withdrawerSigner).withdrawEth(
        hash,
        res.withdrawId,
        withdrawerSigner.address,
        withdrawAmount,
        [proofInput[0], proofInput[1]],
        [
          [proofInput[2], proofInput[3]],
          [proofInput[4], proofInput[5]],
        ],
        [proofInput[6], proofInput[7]]
      )
    ).to.be.revertedWith("CardinalVault: proof invalid");
  });

  it("Fails to withdraw with the same withdrawId and different proof", async () => {
    const { solProof, hash, withdrawId } = await getWithdrawInputs(
      key,
      withdrawerSigner.address,
      salt
    );

    const withdrawAmount = ethers.utils.parseUnits("1", "ether");
    const proofArray = solProof
      .split('"')
      .filter((e: string) => e.startsWith("0x"));

    await expect(
      cardinalVault.connect(withdrawerSigner).withdrawEth(
        hash,
        withdrawId,
        withdrawerSigner.address,
        withdrawAmount,
        [proofArray[0], proofArray[1]],
        [
          [proofArray[2], proofArray[3]],
          [proofArray[4], proofArray[5]],
        ],
        [proofArray[6], proofArray[7]]
      )
    ).to.be.revertedWith("CardinalVault: withdrawId spent");
  });

  it("Successfully withdraw with different withdrawId and proof", async () => {
    const res = await getWithdrawInputs(key, withdrawerSigner.address, salt2);

    const solProof = res.solProof;
    hash = res.hash;
    withdrawId = res.withdrawId;

    const withdrawAmount = ethers.utils.parseUnits("1", "ether");

    proofInput = solProof.split('"').filter((e: string) => e.startsWith("0x"));

    const subvaultBalanceBefore = await cardinalVault.ethSubvaults(hash);
    const withdrawIdBefore = await cardinalVault.ethSubvaultsWithdrawIds(
      hash,
      withdrawId
    );
    const cardinalBalanceBefore = await ethers.provider.getBalance(
      cardinalVault.address
    );
    const withdrawerBalanceBefore = await ethers.provider.getBalance(
      withdrawerSigner.address
    );
    const tx = await cardinalVault.connect(withdrawerSigner).withdrawEth(
      hash,
      withdrawId,
      withdrawerSigner.address,
      withdrawAmount,
      [proofInput[0], proofInput[1]],
      [
        [proofInput[2], proofInput[3]],
        [proofInput[4], proofInput[5]],
      ],
      [proofInput[6], proofInput[7]]
    );
    const subvaultBalanceAfter = await cardinalVault.ethSubvaults(hash);
    const withdrawIdAfter = await cardinalVault.ethSubvaultsWithdrawIds(
      hash,
      withdrawId
    );
    const cardinalBalanceAfter = await ethers.provider.getBalance(
      cardinalVault.address
    );
    const withdrawerBalanceAfter = await ethers.provider.getBalance(
      withdrawerSigner.address
    );

    expect(withdrawIdBefore).to.be.false;
    expect(withdrawIdAfter).to.be.true;
    expect(subvaultBalanceBefore.sub(subvaultBalanceAfter)).to.be.eq(
      withdrawAmount
    );
    expect(cardinalBalanceAfter).to.be.eq(
      cardinalBalanceBefore.sub(withdrawAmount)
    );
    expect(withdrawerBalanceBefore).lessThan(withdrawerBalanceAfter);

    const receipt = await tx.wait();
  });
});
