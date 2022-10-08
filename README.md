# CardinalVault

CardinalVault.sol is a proof-of-concept Solidity zkSNARK ETH and token vault.

It consists of a collection of subvaults. A subvault is a bytes32 "address" of a balance which keeps track of ETH or ERC20 associated with it.

Anyone can deposit tokens to any subvault without limit.

In order to withdraw from a subvault, a user must provide a zkSNARK proof that they know the bytes32 private key which hashes to the bytes32 subvault address.

This repository also contains a handy Hardhat task to easily generate the desired hashes and proofs: `npx hardhat cardinal`.

## What does the ZK proof prove?

It proves knowledge of a bytes32 `hash_pk`, a bytes32 `hash`, a bytes20 `address`, a bytes32 `salt`, and a bytes32 `withdrawId` _such that_ `hash` is a sha256 hash of `hash_pk`, and `withdrawId` is a binary sha256 hash of the concatenated bits of `hash_pk`, `address`, and `salt` (in that order and big-endian). Out of these, the three publically disclosed pieces of data are the `hash`, `address`, and `withdrawId`.

The fundamental relationship that is being proved is the fact that `sha256(hash_pk) === hash`. The relationship `sha256(hash_pk + address + salt) === withdrawId` is added in order to prevent reuse of proofs. `address` is introduced to make each `withdrawId` unique to a given withdrawer (and is baked into the contract to make front-running pointless), `salt` is introduced to allow every withdrawer 2^256 possible withdrawals from a given vault. This is done on the assumption that it is infeasible to guess `hash_pk` by observing a number of different proofs used by a given user to satisfy the two abovementioned relationships. 

Keep in mind that the cryptographic soundness of this approach to proof forgery prevention *has not been formally demonstrated to my knowledge*, and for that reason might have underlying vulnerabilities. 

## Privacy

This vault does *not* create anonymity, as the ability to withdraw tokens from a given subvault after it has had tokens deposited onto it suggests some sort of off-chain coordination between participants, even if a large number of funds of diverse origin happen to be deposited into a single subvault. 

## Note on circuit inputs

The inputs in a few cases must be bytes32 values. However, circom operates over a field modulo `21888242871839275222246405745257275088548364400416034343698204186575808495617`. This creates a problem, as the maximum bytes32 value is `115792089237316195423570985008687907853269984665640564039457584007913129639935`, which means that in some cases the inputs might get modulo'd and invalidade the remaining hashing. For that reason, CardinalVault.sol first splits all bytes32 values into two uint256 values, which are in fact always under uint128 in size, which are then glued together into a bit array inside circom on which the checks then get conducted. 

Though this might seem like a wild solution, it works. Perhaps someday, when circom adds the possibility of setting `GLOBAL_FIELD_P`, such eccentricities will become unnecessary.
