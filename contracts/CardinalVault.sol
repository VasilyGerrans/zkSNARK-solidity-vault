// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import { ReentrancyGuard } from "./ReentrancyGuard.sol";
import { IERC20Min } from "./IERC20Min.sol";
import { IVerifierMin } from "./IVerifierMin.sol";

contract CardinalVault is ReentrancyGuard {
    IVerifierMin public immutable verifier;

    mapping(bytes32 => uint256) public ethSubvaults;
    mapping(bytes32 => mapping(bytes32 => bool)) public ethSubvaultsWithdrawIds;
    mapping(bytes32 => mapping(address => uint256)) public tokenSubvaults;
    mapping(bytes32 => mapping(address => mapping(bytes32 => bool)))
        public tokenSubvaultsWithdrawIds;

    constructor(address verifierAddress) payable {
        verifier = IVerifierMin(verifierAddress);
    }

    function depositEth(bytes32 subvault) external payable {
        ethSubvaults[subvault] = ethSubvaults[subvault] + msg.value;
    }

    function withdrawEth(
        bytes32 subvault,
        bytes32 withdrawId,
        address payable recipient,
        uint256 amount,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external nonReentrant {
        require(
            ethSubvaults[subvault] >= amount,
            "CardinalVault: subvault balance insufficient"
        );
        require(
            ethSubvaultsWithdrawIds[subvault][withdrawId] == false,
            "CardinalVault: withdrawId spent"
        );
        (uint256 vaultUintOne, uint256 vaultUintTwo) = slashBytes(subvault);
        (uint256 withdrawIdUintOne, uint256 withdrawIdUintTwo) = slashBytes(
            withdrawId
        );
        require(
            verifier.verifyProof(
                a,
                b,
                c,
                [
                    withdrawIdUintTwo,
                    withdrawIdUintOne,
                    vaultUintTwo,
                    vaultUintOne,
                    uint256(uint160(address(recipient)))
                ]
            ),
            "CardinalVault: proof invalid"
        );
        ethSubvaultsWithdrawIds[subvault][withdrawId] = true;
        ethSubvaults[subvault] = ethSubvaults[subvault] - amount;
        recipient.transfer(amount);
    }

    function depositToken(
        bytes32 subvault,
        address tokenAddress,
        uint256 amount
    ) external {
        IERC20Min token = IERC20Min(tokenAddress);
        uint256 balanceBefore = token.balanceOf(address(this));
        token.transferFrom(msg.sender, address(this), amount);
        uint256 balanceDiff = token.balanceOf(address(this)) - balanceBefore;
        tokenSubvaults[subvault][tokenAddress] =
            tokenSubvaults[subvault][tokenAddress] +
            balanceDiff;
    }

    function withdrawToken(
        bytes32 subvault,
        bytes32 withdrawId,
        address tokenAddress,
        address payable recipient,
        uint256 amount,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external nonReentrant {
        require(
            tokenSubvaults[subvault][tokenAddress] >= amount,
            "CardinalVault: subvault balance insufficient"
        );
        require(
            tokenSubvaultsWithdrawIds[subvault][tokenAddress][withdrawId] == false,
            "CardinalVault: withdrawId taken"
        );
        {
            (uint256 vaultUintOne, uint256 vaultUintTwo) = slashBytes(subvault);
            (uint256 withdrawIdUintOne, uint256 withdrawIdUintTwo) = slashBytes(
                withdrawId
            );
            require(
                verifier.verifyProof(
                    a,
                    b,
                    c,
                    [
                        withdrawIdUintTwo,
                        withdrawIdUintOne,
                        vaultUintTwo,
                        vaultUintOne, 
                        uint256(uint160(address(recipient)))
                    ]
                ),
                "CardinalVault: proof invalid"
            );
        }
        tokenSubvaultsWithdrawIds[subvault][tokenAddress][withdrawId] = true;
        IERC20Min token = IERC20Min(tokenAddress);
        uint256 balanceBefore = token.balanceOf(address(this));
        IERC20Min(tokenAddress).transfer(recipient, amount);
        uint256 balanceDiff = token.balanceOf(address(this)) - balanceBefore;
        tokenSubvaults[subvault][tokenAddress] = tokenSubvaults[subvault][tokenAddress] - balanceDiff;
    }

    function slashBytes(bytes32 targetHash)
        internal
        pure
        returns (uint256 first, uint256 second)
    {
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
}
