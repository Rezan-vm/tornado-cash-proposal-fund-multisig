//SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Example proposal, transfer some TORN tokens to DUDE
contract TCashProposal {
    IERC20 public constant TORN = IERC20(0x77777FeDdddFfC19Ff86DB637967013e6C6A116C);
    address public constant DUDE = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    uint256 public constant TRANSFER_AMOUNT = 10 ether;

    function executeProposal() public {
        TORN.transfer(DUDE, TRANSFER_AMOUNT);
    }
}
