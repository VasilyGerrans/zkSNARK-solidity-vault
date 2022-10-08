// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IVerifierMin {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[5] memory input
    ) external view returns (bool r);
}