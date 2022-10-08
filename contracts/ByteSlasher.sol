// @note A leftover contract which shows how to glue two uints into a bytes32 if ever necessary.

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract ByteSlasher
{
    function slashBytes(bytes32 targetHash) external pure returns (uint first, uint second) {
        assembly {
            mstore(0x0, 0x0)
            mstore(0x20, 0x0)
            mstore(0x10, targetHash)
            first := mload(0x0)
            mstore(0x0, 0x0)
            second := mload(0x10)
        }
        return (first, second);
    } 

    function glueUints(uint first, uint second) external pure returns (bytes32 targetHash) {
        require(first < 2**128,  "uint must be under bytes16");
        require(second < 2**128, "uint must be under bytes16");

        assembly {
            mstore(0x10, second)
            mstore(0x0, first)
            targetHash := mload(0x10)
        }
    }
}